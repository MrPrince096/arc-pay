/**
 * Browser wallet-connect module — the ONE shared piece used by both the
 * dashboard (view balance) and the invoice pay page (send USDC). Bundled by
 * Vite (see vite.config.ts) into a single script the SPA loads via
 * `<script src="/static/wallet-bundle.js">` — everything else in this
 * project is bundler-free, this is the one deliberate, documented
 * exception (Circle's own App Kit + its dependency chain — viem, abitype,
 * zod — is meant to be consumed through a bundler, confirmed by reading the
 * real installed package, not just the docs).
 *
 * Uses the browser-injected-wallet model (EIP-6963/`window.ethereum`) — so
 * this page must be opened in a real browser tab with a wallet extension
 * (MetaMask, Rabby, etc.), not an embedded/isolated webview.
 */
import { AppKit, type BridgeStep, type SwapResult, type SwapEstimate } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { ArcTestnet } from "@circle-fin/app-kit/chains";
import type { EIP1193Provider } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const kit = new AppKit();
// AdapterCapabilities isn't publicly exported from either package — let
// inference give this its real type via ReturnType, rather than naming
// something the SDK doesn't expose.
let adapter: Awaited<ReturnType<typeof createViemAdapterFromProvider>> | null = null;
let connectedAddress: string | null = null;

async function connect(): Promise<string> {
  const eth = window.ethereum;
  if (!eth) {
    throw new Error(
      "No injected wallet found. Install MetaMask (or another EIP-1193 wallet), add Arc Testnet, and open this page in a normal browser tab.",
    );
  }
  await eth.request({ method: "eth_requestAccounts" });
  adapter = await createViemAdapterFromProvider({ provider: eth, capabilities: { addressContext: "user-controlled" } });
  connectedAddress = await adapter.getAddress(ArcTestnet);
  return connectedAddress;
}

function getAddress(): string | null {
  return connectedAddress;
}

/** Sends `amountUsdc` (decimal string, e.g. "1.50") to `to`. Returns the tx hash on success, throws with a clear message otherwise. */
async function send(to: string, amountUsdc: string): Promise<string> {
  if (!adapter) throw new Error("Connect a wallet first.");
  const step: BridgeStep = await kit.send({
    from: { adapter, chain: "Arc_Testnet" },
    to,
    amount: amountUsdc,
    token: "USDC",
  });
  if (step.state !== "success" || !step.txHash) {
    throw new Error(step.errorMessage || `Send did not complete (state: ${step.state}).`);
  }
  return step.txHash;
}

/** Read-only quote — no wallet approval prompt, no funds moved. */
async function estimateSwap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<SwapEstimate> {
  if (!adapter) throw new Error("Connect a wallet first.");
  return kit.estimateSwap({ from: { adapter, chain: "Arc_Testnet" }, tokenIn, tokenOut, amountIn });
}

/**
 * Executes the swap (prompts the wallet for one or two on-chain
 * transactions: approve + swap). Returns the tx hash on success.
 *
 * Forces `allowanceStrategy: 'approve'` — App Kit's default is a gasless
 * EIP-2612 'permit' signature with fallback to on-chain approve, but the
 * permit path fails on Arc Testnet with "Permit generation failed ...
 * chainId should be same as current chainId" (confirmed live). Arc's USDC
 * ERC-20 interface likely doesn't support EIP-2612 permit the way App Kit
 * expects, so this skips straight to the standard on-chain approve.
 */
async function swap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<string> {
  if (!adapter) throw new Error("Connect a wallet first.");
  const result: SwapResult = await kit.swap({
    from: { adapter, chain: "Arc_Testnet" },
    tokenIn,
    tokenOut,
    amountIn,
    config: { allowanceStrategy: "approve" },
  });
  if (result.progress.status === "FAILED" || result.progress.status === "NOT_FOUND" || !result.txHash) {
    throw new Error(result.progress.substatusMessage || `Swap did not complete (status: ${result.progress.status}).`);
  }
  return result.txHash;
}

window.ArcPayWallet = { connect, getAddress, send, estimateSwap, swap };

declare global {
  interface Window {
    ArcPayWallet: {
      connect(): Promise<string>;
      getAddress(): string | null;
      send(to: string, amountUsdc: string): Promise<string>;
      estimateSwap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<SwapEstimate>;
      swap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<string>;
    };
  }
}
