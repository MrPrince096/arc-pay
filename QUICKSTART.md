# Quickstart

Zero to a running dashboard in a couple minutes. **No wallet or funds needed**
for the first two steps — those only matter once you want to send a real
testnet transaction.

## 0. One-time setup

```bash
pnpm install
cp .env.example .env    # optional; defaults work for check/dashboard/invoicing
pnpm test                # sanity check — 27 tests should pass
```

## 1. Confirm the chain is reachable (`check`)

```bash
pnpm check
```

Calls the live Arc testnet RPC directly — confirms the chain id matches
(`5042002`), prints the current block height (not a cached value), and
confirms known contracts (Multicall3, the USDC ERC-20 interface) actually
have deployed bytecode. If this fails, nothing else will work — check your
network or `ARC_RPC_URL`.

## 2. Start the dashboard

```bash
pnpm dev   # builds the wallet-connect bundle, then starts the server
```

Open **http://localhost:8787** in a real Chrome/Firefox/Safari tab — not an
embedded webview, since wallet connect needs `window.ethereum`.

At this point you can already create a payment request and get a shareable
`/pay/:id` link — you just need a wallet to actually connect and send.

## 3. Get a wallet onto Arc Testnet (optional, for real sends)

Add the network to MetaMask (Networks → Add network → Add manually):

| Field | Value |
|---|---|
| RPC URL | `https://rpc.testnet.arc.io` |
| Chain ID | `5042002` |
| Currency symbol | USDC |
| Block explorer | `https://testnet.arcscan.app` |

Claim testnet USDC at [faucet.circle.com](https://faucet.circle.com)
(captcha-gated — do this yourself).

Now on the dashboard: **Connect wallet** → see your real balance (both the
native and ERC-20-interface readings, which should match) → recent transfers.

## 3.5. Try the swap

On `/swap`: pick USDC → EURC (or flip it), enter an amount, **Get quote** —
no wallet prompt, purely a read. Happy with the numbers? **Swap** prompts
your wallet for approval (up to two signatures: an ERC-20 approve, then the
swap itself) and executes for real. This calls Circle App Kit's own
`kit.swap()` — the same primitive as `send()`, just for a different
operation — not a hand-rolled contract call.

## 4. Try the payments flow

On the dashboard, fill in a recipient address + amount, **Create invoice** —
you get a `/pay/:id` link. Open it (in the same or a different browser),
connect a wallet, and pay. The server verifies the payment **on-chain**
before marking it paid — it never just trusts what the payer's browser says.

## 5. Try the agent-pays demo — dry-run, no credentials needed

```bash
# server already running from step 2
```

Open **http://localhost:8787/agent**. Fill in any address and an amount,
click **Trigger agent payment**. With no `.env` gates set, you'll see:

```
DRY-RUN — would send $0.01 to 0x… for "unlock-content" (spend cap OK,
$0.000000 spent today) — nothing sent (set AGENT_LIVE_CONFIRM=I_UNDERSTAND +
CIRCLE_API_KEY/CIRCLE_ENTITY_SECRET/AGENT_WALLET_ADDRESS to send).
```

Try an amount over `0.01` (the default per-action cap) — it's refused
outright, before Circle's SDK is ever touched:

```
Refused: $5 exceeds the per-action cap of $0.01.
```

## 6. Going live on the agent demo (real testnet funds) — your decision, your keys

**Only you do this, with your own Circle Developer account and a wallet you
fund yourself.** The agent's live path exists and is fully wired, but stays
dry-run until you deliberately set all three gates in `.env`:

1. A free [Circle Developer account](https://console.circle.com) →
   `CIRCLE_API_KEY` + `CIRCLE_ENTITY_SECRET`
2. `AGENT_WALLET_ADDRESS` — an address you control, funded via
   [faucet.circle.com](https://faucet.circle.com)
3. `AGENT_LIVE_CONFIRM=I_UNDERSTAND` — the explicit confirm gate

With all three set, restart `pnpm dev` and trigger an action again — it will
construct a real Circle Wallets adapter, sign, and send. The response
switches to:

```
🔴 LIVE SEND — sent $0.01 to 0x… for "unlock-content". REAL FUNDS MOVED.
```

...and the spend log records the real transaction hash (linked to
`testnet.arcscan.app`). Tighten `AGENT_MAX_SPEND_PER_ACTION_USDC` and
`AGENT_DAILY_SPEND_CAP_USDC` in `.env` before doing this if you want a
smaller ceiling than the defaults.

> Testnet only. Nothing here has been reviewed for mainnet use — treat any
> funds you put on Arc Testnet as disposable.
