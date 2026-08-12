import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { ARC_CHAIN_ID, ARC_RPC_URL, ARC_WS_URL, ARC_EXPLORER_URL } from "./constants.js";

/**
 * Arc testnet as a viem chain. Native currency is USDC itself (18-decimal
 * internal precision for gas accounting) — verified live via `eth_chainId`
 * this session, not assumed.
 */
export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL], webSocket: [ARC_WS_URL] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_EXPLORER_URL },
  },
  testnet: true,
});

export const arcClient: PublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_RPC_URL),
});
