import { isAddress } from "viem";
import { getWalletBalance } from "../chain/balance.js";
import { getTxHistory } from "../chain/txHistory.js";
import { verifyPayment } from "../chain/payments.js";
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
