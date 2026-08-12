/**
 * Core domain types shared across the app. Every layer (chain, server,
 * agent) talks in these so pieces compose without rewrites.
 */

export type InvoiceStatus = "pending" | "paid" | "expired";

/** A payment request created by the invoice's recipient. Off-chain concept — can't be reconstructed from chain data alone, so this is the one thing we persist as source of truth. */
export interface Invoice {
  id: string;
  recipient: string;
  amountUsdc: number;
  memo?: string;
  status: InvoiceStatus;
  payerAddress?: string;
  /** Only set once the server has independently verified the payment via getTransactionReceipt — never trust a client-reported hash alone. */
  txHash?: string;
  createdAt: number;
  paidAt?: number;
}

/** One entry in the agent's append-only spend log — written only after a real send succeeds. */
export interface AgentSpendEntry {
  id: string;
  amountUsdc: number;
  action: string;
  txHash: string;
  timestamp: number;
}

/** Arc's dual balance representation: native (18-dec, IS the USDC balance) and the ERC-20 interface (6-dec, same underlying balance, different view). Both should reconcile to the same USDC amount. Also includes EURC, a separate token, for the swap UI's "you have" display. */
export interface WalletBalance {
  address: string;
  nativeUsdc: number;
  erc20Usdc: number;
  eurc: number;
}

export interface TxSummary {
  hash: string;
  from: string;
  to: string;
  amountUsdc: number;
  blockNumber: number;
  timestamp?: number;
}
