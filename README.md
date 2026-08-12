# Arc Pay

A standalone USDC dashboard, payments/invoicing tool, USDC↔EURC swap, a
free-mint NFT demo, message/typed-data signing, and an autonomous agent-pays
demo, built on **Arc** — Circle's new EVM-compatible L1 where **USDC is the
native gas token**.

> ⚠️ **Testnet only, right now.** Every value in this codebase (chain id,
> RPC/explorer URLs, contract addresses) was verified directly against Arc's
> live testnet — Arc launched only weeks before this project was built, so
> nothing here is guessed from training data. See `src/chain/constants.ts`
> for the verified values and how each was confirmed.

**→ Just want to see it?**
```bash
pnpm install
pnpm dev   # then open http://localhost:8787
```

**→ Prefer a guided walkthrough?** Start with [QUICKSTART.md](QUICKSTART.md).

## What's here

| Feature | State |
|---|---|
| Live RPC connectivity check (`pnpm check`) | ✅ done |
| Wallet dashboard — connect, view USDC balance (native + ERC-20 view) | ✅ done |
| Transaction history (recent USDC transfers) | ✅ done |
| Payment requests / invoicing — create, shareable `/pay/:id` link | ✅ done |
| On-chain payment verification (never trusts a client-reported "paid") | ✅ done |
| Agent-pays demo — gated autonomous USDC micropayments | ✅ done, live-verified (real send, real tx on Arcscan) |
| Spend-cap enforcement (per-action + daily, checked before any send) | ✅ done |
| USDC ↔ EURC swap (`/swap`) — via App Kit's own `kit.swap()`, real balance shown, MAX button | ✅ done, live-verified |
| NFT mint (`/mint`) — a real ERC-721 this project wrote, deployed, and verified on Arc Testnet | ✅ done, live-verified (real mint, real owner on-chain) |
| Message + typed-data signing (`/sign`) — server-verified via ecrecover | ✅ done, live-verified |
| Dedicated pages: `/faucet` (links to Circle's real faucet), `/transactions` (full history, any address) | ✅ done |
| Sidebar nav shared across all pages, precision-instrument design system | ✅ done |
| Automated test suite (Vitest, 27 tests) | ✅ done |

## Why Arc

Arc is Circle's EVM-compatible L1, purpose-built around USDC:

- **Gas token is USDC itself** — `eth_getBalance` returns your USDC balance
  directly (18-decimal precision for gas accounting). A second, standard
  ERC-20 interface at `0x3600…0000` exposes the *same* balance at the usual
  6-decimal USDC precision, for application-level transfers/display.
- **~$0.01/tx typical fees**, EIP-1559 + EWMA smoothing.
- **Official SDK** (`@circle-fin/app-kit` + adapters) for both browser-wallet
  sends (`adapter-viem-v2`, EIP-6963 injected wallets) and server-signed
  sends via Circle's own "developer-controlled wallets"
  (`adapter-circle-wallets`) — Circle's purpose-built answer to "let an
  autonomous agent sign and send" without ever handling a raw private key
  yourself.

## Quick start

```bash
pnpm install
cp .env.example .env     # optional; defaults work for check/dashboard/invoicing
pnpm check                # live RPC smoke test — confirms Arc testnet is reachable
pnpm dev                  # builds the wallet-connect bundle, starts the server
```

Then open **http://localhost:8787** in a real browser tab (not an embedded
webview — wallet connect needs `window.ethereum`, an injected-provider
standard that isolated/embedded browsers don't expose).

To try it against a real wallet: add [Arc Testnet to MetaMask](#add-arc-testnet-to-metamask)
below, claim testnet USDC from the faucet, then click "Connect wallet" on the
dashboard.

## Add Arc Testnet to MetaMask

MetaMask → Networks → Add network → Add a network manually:

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.io` |
| Chain ID | `5042002` |
| Currency symbol | USDC |
| Block explorer | `https://testnet.arcscan.app` |

Then claim testnet USDC at [faucet.circle.com](https://faucet.circle.com)
(captcha-gated — you have to claim it yourself, this can't be automated).

## The six features

### 1. Wallet dashboard

Connect an injected wallet (MetaMask, Rabby, …), see your USDC balance (both
the native 18-decimal reading and the 6-decimal ERC-20-interface view, which
should always agree), and your recent USDC transfers. Balance and history are
**always read live from the RPC** — nothing about them is persisted locally,
so the dashboard can never drift from on-chain truth.

Transaction history scans the last 10,000 blocks by default
([`src/chain/txHistory.ts`](src/chain/txHistory.ts)) — empirically the
largest range Arc's `eth_getLogs` reliably accepts (20,000 succeeds, 50,000
fails with "requested range too large").

### 2. Payments / invoicing

Create a payment request (`recipient`, `amount`, optional memo) from the
dashboard — you get a shareable `/pay/:id` link. Whoever opens that link
connects their own wallet and sends the exact amount with one click. The
server **independently verifies the payment on-chain**
([`src/chain/payments.ts`](src/chain/payments.ts)) — checking both possible
transfer shapes (an ERC-20 `Transfer` log, or a bare native-value transfer)
before ever marking an invoice paid. A client claiming "I paid" is never
enough on its own. (`kit.send()`'s actual on-chain shape is now confirmed —
see the note in `txHistory.ts` — but the verifier still checks both, for
robustness.)

### 3. Swap — USDC ↔ EURC

At `/swap`: quote and execute a USDC↔EURC swap via App Kit's own
`kit.swap()` / `kit.estimateSwap()` — no hand-rolled contract calls. A live
quote was confirmed working on Arc Testnet: `0.01 USDC → 0.008849 EURC`
(fees: ~0.000002 USDC provider fee + ~0.047 USDC gas). Under the hood this
almost certainly routes through **Arc Swap**, a Uniswap V2 fork deployed on
Arc Testnet by a community contributor (not an official Circle deployment —
see [`src/chain/constants.ts`](src/chain/constants.ts) for the verified
factory/router/pair addresses, confirmed live via real bytecode + non-zero
reserves), but the app only ever calls App Kit's own interface, never that
contract directly.

### 4. Mint — free NFT demo

At `/mint`: a real ERC-721 ([`contracts/ArcPayDemoNFT.sol`](contracts/ArcPayDemoNFT.sol))
this project wrote, compiled, and deployed itself — no OpenZeppelin import,
no framework, ~150 lines implementing the standard interface directly. Free
public mint, capped at 10,000 tokens / 5 per wallet, fully on-chain
`tokenURI` (no off-chain metadata to keep alive). Deployment was funded from
the agent wallet ([`scripts/deploy-nft.ts`](scripts/deploy-nft.ts)), and the
whole thing was verified with a real end-to-end mint via Circle's
Developer-Controlled Wallets contract-execution API
([`scripts/test-mint.ts`](scripts/test-mint.ts)) — `totalSupply` went to
`1`, owned by the sender, confirmed by reading it back from the chain. Each
visitor's own connected wallet calls `mint()` directly and pays its own gas
— no server involved in the mint itself.

### 5. Sign — message & typed-data signing

At `/sign`: `personal_sign` and EIP-712 typed-data signing, both via plain
viem against the connected wallet — App Kit's adapters only expose
send/swap/permit-signing, no generic message signing, so this bypasses App
Kit entirely for these two ([`src/client/walletConnect.entry.ts`](src/client/walletConnect.entry.ts)).
Off-chain, no gas, no transaction. Every signature is independently
re-verified server-side via `ecrecover`
([`src/server/api.ts`](src/server/api.ts)) — verified live with a real
signature (valid → `true`) and a deliberately mismatched address (→
`false`), matching the "never just trust the client" posture used
everywhere else in this app.

### 6. Agent-pays demo

At `/agent`: a server-side "agent" that autonomously pays a tiny USDC amount
per action — no wallet popup, since the agent signs with its own
Circle-managed **developer-controlled wallet**
([`src/agent/circleWalletsAgent.ts`](src/agent/circleWalletsAgent.ts)).

Layered exactly like the sibling `Crypto auto` project's live brokers:

- A **spend cap is checked first**, before anything else —
  `AGENT_MAX_SPEND_PER_ACTION_USDC` (default `0.01`) and
  `AGENT_DAILY_SPEND_CAP_USDC` (default `1.00`,
  [`src/agent/spendCap.ts`](src/agent/spendCap.ts)). A capped amount is
  refused without ever touching Circle's SDK — no credentials needed at all
  to see it work.
- Sending for real needs **all three**, set by you:
  1. env `AGENT_LIVE_CONFIRM=I_UNDERSTAND`
  2. `CIRCLE_API_KEY` + `CIRCLE_ENTITY_SECRET` (free [Circle Developer
     account](https://console.circle.com))
  3. a funded `AGENT_WALLET_ADDRESS` (claim testnet USDC yourself at
     [faucet.circle.com](https://faucet.circle.com))
- Without all three, every trigger returns a `DRY-RUN` result — spend-cap
  math runs for real, nothing is sent, nothing recorded. Verified live at
  every stage: dry-run with no `.env` set, over-cap rejection, and — with
  real Circle credentials + a real Circle-managed Arc Testnet wallet + the
  confirm gate flipped — an actual live send with a real tx hash.
- A spend is only ever recorded ([`src/server/agentSpendStore.ts`](src/server/agentSpendStore.ts))
  **after** a real send reports `state: "success"` — never speculatively.

## Tests

```bash
pnpm test          # run once (27 tests)
pnpm test:watch    # watch mode
pnpm typecheck      # tsc --noEmit, both the server (Node) and client (DOM) configs
```

Deterministic, no real network: invoice CRUD/status transitions, on-chain
payment verification (using **real viem-encoded** Transfer-log fixtures, not
synthetic data), spend-cap math, and the agent's gating logic (mocking
Circle's SDK — confirms a capped or dry-run action never even constructs a
real Circle Wallets adapter).

## Architecture

```
core/      env loading, logger, shared types
chain/     viem client for Arc testnet, balance/NFT reads, tx history, payment verification
server/    zero-dep node:http server, JSON routes, shared theme.ts design system + page shell
client/    the ONE bundled browser file (wallet-connect + kit.send/swap + plain-viem sign/mint,
           via Vite) — everything else is plain unbundled Node, same house style as the
           sibling Crypto auto project
agent/     spend-cap enforcement + the gated Circle-Wallets-signed send
contracts/ ArcPayDemoNFT.sol — the hand-written ERC-721 this project deployed itself
cli/       pnpm check — live RPC connectivity smoke test
scripts/   one-time setup/deploy scripts (entity secret, agent wallet, NFT compile/deploy)
```

**Why one Vite build, when everything else is bundler-free?** Circle's
`@circle-fin/app-kit` + wallet adapters pull in ~1,365 modules (viem, zod,
`@solana/web3.js`, …) when bundled — confirmed by actually running the build.
That's not consumable via a raw `<script>` tag, so the browser wallet-connect
module gets a narrowly-scoped Vite build
([`vite.config.ts`](vite.config.ts)) while the HTTP server stays plain
`tsx`/`node:http`. This is the one deliberate exception to the zero-bundler
rule, and it's contained to a single file
([`src/client/walletConnect.entry.ts`](src/client/walletConnect.entry.ts)).

## Data model

**Persisted** (`data/`, JSON, gitignored) — off-chain concepts that can't be
reconstructed from chain data alone: `invoices.json`, `agent-spend.json`
(append-only spend log, used to compute the rolling daily cap).

**Never persisted** — always read live from the RPC: wallet balance,
transaction history. Keeps the app trivially restart-safe and immune to
local/chain drift.

## Safety notes

- `.env` is gitignored. Never commit real Circle credentials or a funded
  wallet's private key.
- The agent's live-send path is gated by three independent conditions —
  spend cap, explicit confirm, and real credentials — checked in that order,
  so a misconfigured or partially-set `.env` fails safe (stays dry-run)
  rather than failing open.
- Testnet only. This codebase has not been reviewed for mainnet use.
