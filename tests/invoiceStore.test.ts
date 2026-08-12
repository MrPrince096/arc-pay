import { describe, it, expect, vi, beforeEach } from "vitest";

let files: Record<string, unknown> = {};
vi.mock("../src/server/jsonStore.js", () => ({
  readJson: vi.fn(async (name: string, fallback: unknown) => (name in files ? files[name] : fallback)),
  writeJson: vi.fn(async (name: string, data: unknown) => {
    files[name] = JSON.parse(JSON.stringify(data));
  }),
}));

const { createInvoice, getInvoice, listInvoices, markInvoicePaid } = await import("../src/server/invoiceStore.js");

beforeEach(() => {
  files = {};
});

describe("invoiceStore", () => {
  it("creates an invoice with a pending status and a generated id", async () => {
    const invoice = await createInvoice({ recipient: "0xabc", amountUsdc: 10.5, memo: "rent" });
    expect(invoice.status).toBe("pending");
    expect(invoice.id).toBeTruthy();
    expect(invoice.recipient).toBe("0xabc");
    expect(invoice.amountUsdc).toBe(10.5);
    expect(invoice.memo).toBe("rent");
    expect(invoice.createdAt).toBeGreaterThan(0);
  });

  it("persists across calls — a second createInvoice doesn't clobber the first", async () => {
    const a = await createInvoice({ recipient: "0xa", amountUsdc: 1 });
    const b = await createInvoice({ recipient: "0xb", amountUsdc: 2 });
    const all = await listInvoices();
    expect(all.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("getInvoice returns null for an unknown id", async () => {
    expect(await getInvoice("does-not-exist")).toBeNull();
  });

  it("getInvoice finds a created invoice by id", async () => {
    const created = await createInvoice({ recipient: "0xc", amountUsdc: 3 });
    const found = await getInvoice(created.id);
    expect(found).toEqual(created);
  });

  it("markInvoicePaid transitions status and records payer/txHash/paidAt", async () => {
    const created = await createInvoice({ recipient: "0xd", amountUsdc: 5 });
    const paid = await markInvoicePaid(created.id, "0xPayer", "0xTxHash");
    expect(paid.status).toBe("paid");
    expect(paid.payerAddress).toBe("0xPayer");
    expect(paid.txHash).toBe("0xTxHash");
    expect(paid.paidAt).toBeGreaterThan(0);

    const reloaded = await getInvoice(created.id);
    expect(reloaded?.status).toBe("paid");
  });

  it("markInvoicePaid is idempotent — calling it again on an already-paid invoice doesn't overwrite with different data", async () => {
    const created = await createInvoice({ recipient: "0xe", amountUsdc: 7 });
    const first = await markInvoicePaid(created.id, "0xPayer1", "0xTx1");
    const second = await markInvoicePaid(created.id, "0xPayer2", "0xTx2");
    expect(second).toEqual(first);
  });

  it("markInvoicePaid throws for an unknown invoice id", async () => {
    await expect(markInvoicePaid("nope", "0xPayer", "0xTx")).rejects.toThrow(/not found/i);
  });
});
