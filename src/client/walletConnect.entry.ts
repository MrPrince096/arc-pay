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
import { createWalletClient, custom, defineChain, type EIP1193Provider, type WalletClient } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

/**
 * App Kit's adapters only expose the high-level financial primitives
 * (send/swap/signTypedData-for-permits) — no plain message signing, no
 * generic contract writes. For the sign demo and NFT mint, we go straight
 * to viem against the same connected provider instead. Chain values match
 * `src/chain/arcClient.ts` exactly (duplicated, not imported — that file
 * reads `process.env`, which doesn't exist in a browser bundle).
 */
const arcTestnetChain = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

const kit = new AppKit();
// AdapterCapabilities isn't publicly exported from either package — let
// inference give this its real type via ReturnType, rather than naming
// something the SDK doesn't expose.
let adapter: Awaited<ReturnType<typeof createViemAdapterFromProvider>> | null = null;
let connectedAddress: string | null = null;
let walletClient: WalletClient | null = null;

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
  walletClient = createWalletClient({ chain: arcTestnetChain, transport: custom(eth) });
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

/** Plain personal_sign — off-chain, no gas, no transaction. Returns the hex signature. */
async function signMessage(message: string): Promise<string> {
  if (!walletClient || !connectedAddress) throw new Error("Connect a wallet first.");
  return walletClient.signMessage({ account: connectedAddress as `0x${string}`, message });
}

/**
 * EIP-712 typed-data signing demo — a fixed "Greeting" struct, purely to
 * demonstrate structured signing (the same mechanism behind permits, just
 * not tied to a specific token). Off-chain, no gas. Returns the exact
 * message/timestamp signed alongside the signature — the caller needs
 * those EXACT values (not independently regenerated ones) to verify, since
 * they're part of what got signed.
 */
async function signTypedDataDemo(): Promise<{ signature: string; message: string; timestamp: number }> {
  if (!walletClient || !connectedAddress) throw new Error("Connect a wallet first.");
  const message = "gm from PraneethArc";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await walletClient.signTypedData({
    account: connectedAddress as `0x${string}`,
    domain: { name: "PraneethArc", version: "1", chainId: 5042002 },
    types: {
      Greeting: [
        { name: "from", type: "address" },
        { name: "message", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    primaryType: "Greeting",
    message: { from: connectedAddress as `0x${string}`, message, timestamp: BigInt(timestamp) },
  });
  return { signature, message, timestamp };
}

const NFT_MINT_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/** Calls `mint()` on the deployed demo NFT collection — the connected wallet pays its own gas and receives the token. */
async function mintNft(contractAddress: string): Promise<string> {
  if (!walletClient || !connectedAddress) throw new Error("Connect a wallet first.");
  return walletClient.writeContract({
    chain: arcTestnetChain,
    account: connectedAddress as `0x${string}`,
    address: contractAddress as `0x${string}`,
    abi: NFT_MINT_ABI,
    functionName: "mint",
  });
}

window.ArcPayWallet = { connect, getAddress, send, estimateSwap, swap, signMessage, signTypedDataDemo, mintNft };

declare global {
  interface Window {
    ArcPayWallet: {
      connect(): Promise<string>;
      getAddress(): string | null;
      send(to: string, amountUsdc: string): Promise<string>;
      estimateSwap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<SwapEstimate>;
      swap(tokenIn: "USDC" | "EURC", tokenOut: "USDC" | "EURC", amountIn: string): Promise<string>;
      signMessage(message: string): Promise<string>;
      signTypedDataDemo(): Promise<{ signature: string; message: string; timestamp: number }>;
      mintNft(contractAddress: string): Promise<string>;
    };
  }
}
