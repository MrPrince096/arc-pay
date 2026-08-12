import { isAddress, verifyMessage, verifyTypedData } from "viem";
import { getWalletBalance } from "../chain/balance.js";
import { getTxHistory } from "../chain/txHistory.js";
import { verifyPayment } from "../chain/payments.js";
import { getNftStats } from "../chain/nft.js";
import { listInvoices, getInvoice, createInvoice, markInvoicePaid } from "./invoiceStore.js";
import { performGatedAction } from "../agent/circleWalletsAgent.js";
import { listSpend } from "./agentSpendStore.js";
import { todaysTotal } from "../agent/spendCap.js";

function requireAddress(q: URLSearchParams): `0x${string}` {
  const address = q.get("address");
  if (!address || !isAddress(address)) throw new Error("A valid address is required.");
  return address;
}

export async function apiBalance(q: URLSearchParams) {
  return getWalletBalance(requireAddress(q));
}

export async function apiTxs(q: URLSearchParams) {
  return getTxHistory(requireAddress(q));
}

/** address is optional here — stats are viewable before connecting a wallet. */
export async function apiNftStats(q: URLSearchParams) {
  const address = q.get("address");
  if (address && !isAddress(address)) throw new Error("address must be a valid 0x address.");
  return getNftStats(address as `0x${string}` | undefined);
}

// --- Invoices ----------------------------------------------------------------

export async function apiListInvoices(_q: URLSearchParams) {
  const invoices = await listInvoices();
  return invoices.sort((a, b) => b.createdAt - a.createdAt);
}

export async function apiGetInvoice(q: URLSearchParams) {
  const id = q.get("id");
  if (!id) throw new Error("id is required.");
  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("Invoice not found.");
  return invoice;
}

export async function apiCreateInvoice(_q: URLSearchParams, body: unknown) {
  const b = body as { recipient?: string; amountUsdc?: number; memo?: string } | undefined;
  const recipient = b?.recipient;
  if (!recipient || !isAddress(recipient)) throw new Error("A valid recipient address is required.");
  const amountUsdc = Number(b?.amountUsdc);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) throw new Error("amountUsdc must be a positive number.");
  const memo = b?.memo?.trim() || undefined;
  return createInvoice({ recipient, amountUsdc, memo });
}

export async function apiConfirmInvoice(_q: URLSearchParams, body: unknown) {
  const b = body as { id?: string; txHash?: string } | undefined;
  const id = b?.id;
  const txHash = b?.txHash;
  if (!id) throw new Error("id is required.");
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("A valid txHash is required.");

  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "paid") return invoice;

  const verification = await verifyPayment(txHash as `0x${string}`, invoice.recipient, invoice.amountUsdc);
  if (!verification.ok) throw new Error(verification.reason ?? "Payment could not be verified on-chain.");

  return markInvoicePaid(id, verification.payerAddress!, txHash);
}

// --- Agent-pays demo ----------------------------------------------------------

export async function apiAgentAction(_q: URLSearchParams, body: unknown) {
  const b = body as { to?: string; amountUsdc?: number; action?: string } | undefined;
  const to = b?.to;
  if (!to || !isAddress(to)) throw new Error("A valid recipient address is required.");
  const amountUsdc = Number(b?.amountUsdc);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) throw new Error("amountUsdc must be a positive number.");
  const action = b?.action?.trim() || "unlock-content";
  return performGatedAction(amountUsdc, action, to);
}

// --- Signature verification ---------------------------------------------------

/** Independently verifies a personal_sign signature server-side — pure math (ecrecover), no chain access needed, but consistent with the app's "never just trust the client" posture used everywhere else (payments, agent sends). */
export async function apiVerifySignature(_q: URLSearchParams, body: unknown) {
  const b = body as { message?: string; signature?: string; address?: string } | undefined;
  const message = b?.message;
  const signature = b?.signature as `0x${string}` | undefined;
  const address = b?.address;
  if (!message) throw new Error("message is required.");
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) throw new Error("A valid signature is required.");
  if (!address || !isAddress(address)) throw new Error("A valid address is required.");
  const valid = await verifyMessage({ address: address as `0x${string}`, message, signature });
  return { valid, address };
}

/** Same idea for the EIP-712 typed-data demo — verifies the fixed "Greeting" struct signed by walletConnect.entry.ts's signTypedDataDemo(). */
export async function apiVerifyTypedData(_q: URLSearchParams, body: unknown) {
  const b = body as { signature?: string; address?: string; message?: string; timestamp?: number } | undefined;
  const signature = b?.signature as `0x${string}` | undefined;
  const address = b?.address;
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) throw new Error("A valid signature is required.");
  if (!address || !isAddress(address)) throw new Error("A valid address is required.");
  const message = b?.message;
  const timestamp = b?.timestamp;
  if (!message || typeof timestamp !== "number" || !Number.isFinite(timestamp)) throw new Error("message and timestamp are required.");
  const valid = await verifyTypedData({
    address: address as `0x${string}`,
    domain: { name: "PraneethArc", version: "1", chainId: 5042002 },
    types: {
      Greeting: [
        { name: "from", type: "address" },
        { name: "message", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    primaryType: "Greeting",
    message: { from: address as `0x${string}`, message, timestamp: BigInt(timestamp) },
    signature,
  });
  return { valid, address };
}

export async function apiAgentSpendLog(_q: URLSearchParams) {
  const log = await listSpend();
  return {
    entries: [...log].sort((a, b) => b.timestamp - a.timestamp),
    todaysTotalUsdc: todaysTotal(log),
    caps: {
      maxPerActionUsdc: Number(process.env.AGENT_MAX_SPEND_PER_ACTION_USDC) || 0.01,
      dailyCapUsdc: Number(process.env.AGENT_DAILY_SPEND_CAP_USDC) || 1.0,
    },
  };
}
