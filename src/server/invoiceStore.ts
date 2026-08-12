import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./jsonStore.js";
import type { Invoice } from "../core/types.js";

const INVOICES_FILE = "invoices.json";

export async function listInvoices(): Promise<Invoice[]> {
  return readJson<Invoice[]>(INVOICES_FILE, []);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  return (await listInvoices()).find((i) => i.id === id) ?? null;
}

export async function createInvoice(params: { recipient: string; amountUsdc: number; memo?: string }): Promise<Invoice> {
  const invoice: Invoice = {
    id: randomUUID(),
    recipient: params.recipient,
    amountUsdc: params.amountUsdc,
    memo: params.memo,
    status: "pending",
    createdAt: Date.now(),
  };
  const invoices = await listInvoices();
  invoices.push(invoice);
  await writeJson(INVOICES_FILE, invoices);
  return invoice;
}

/** Marks an invoice paid. Only ever called AFTER the caller has independently verified the payment on-chain — this function trusts its input. */
export async function markInvoicePaid(id: string, payerAddress: string, txHash: string): Promise<Invoice> {
  const invoices = await listInvoices();
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "paid") return invoice;
  invoice.status = "paid";
  invoice.payerAddress = payerAddress;
  invoice.txHash = txHash;
  invoice.paidAt = Date.now();
  await writeJson(INVOICES_FILE, invoices);
  return invoice;
}
