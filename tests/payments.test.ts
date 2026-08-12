import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeEventTopics, encodeAbiParameters, parseUnits, type Hex, type Address } from "viem";
import { TRANSFER_EVENT } from "../src/chain/abi.js";
import { USDC_ERC20_INTERFACE_ADDRESS } from "../src/chain/constants.js";

const mockGetTransactionReceipt = vi.fn();
const mockGetTransaction = vi.fn();
vi.mock("../src/chain/arcClient.js", () => ({
  arcClient: {
    getTransactionReceipt: (...args: unknown[]) => mockGetTransactionReceipt(...args),
    getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
  },
}));

const { verifyPayment } = await import("../src/chain/payments.js");

const RECIPIENT: Address = "0x1111111111111111111111111111111111111111";
const PAYER: Address = "0x2222222222222222222222222222222222222222";
const TX_HASH = ("0x" + "a".repeat(64)) as Hex;

/** Builds a real, correctly-encoded Transfer log — same shape decodeEventLog expects. */
function buildTransferLog(from: Address, to: Address, amountUsdc: number) {
  const topics = encodeEventTopics({ abi: [TRANSFER_EVENT], eventName: "Transfer", args: { from, to } });
  const data = encodeAbiParameters([{ type: "uint256" }], [parseUnits(String(amountUsdc), 6)]);
  return { address: USDC_ERC20_INTERFACE_ADDRESS as Address, topics, data };
}

beforeEach(() => {
  mockGetTransactionReceipt.mockReset();
  mockGetTransaction.mockReset();
});

describe("verifyPayment", () => {
  it("rejects a failed transaction outright, without inspecting logs", async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: "reverted", logs: [] });
    mockGetTransaction.mockResolvedValue({ to: RECIPIENT, value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 10);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/did not succeed/i);
  });

  it("verifies a matching ERC-20 Transfer log", async () => {
    const log = buildTransferLog(PAYER, RECIPIENT, 10.5);
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [log] });
    mockGetTransaction.mockResolvedValue({ to: "0xSomeOtherContract", value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 10.5);
    expect(result.ok).toBe(true);
    expect(result.payerAddress?.toLowerCase()).toBe(PAYER.toLowerCase());
  });

  it("rejects a Transfer log to the wrong recipient", async () => {
    const wrongRecipient: Address = "0x9999999999999999999999999999999999999999";
    const log = buildTransferLog(PAYER, wrongRecipient, 10.5);
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [log] });
    mockGetTransaction.mockResolvedValue({ to: "0xSomeOtherContract", value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 10.5);
    expect(result.ok).toBe(false);
  });

  it("rejects a Transfer log to the right recipient but the wrong amount", async () => {
    const log = buildTransferLog(PAYER, RECIPIENT, 5);
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [log] });
    mockGetTransaction.mockResolvedValue({ to: "0xSomeOtherContract", value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 10.5);
    expect(result.ok).toBe(false);
  });

  it("falls back to a bare native-value transfer match when no ERC-20 log matches", async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [] });
    mockGetTransaction.mockResolvedValue({ to: RECIPIENT, value: parseUnits("3.25", 18), from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 3.25);
    expect(result.ok).toBe(true);
    expect(result.payerAddress).toBe(PAYER);
  });

  it("rejects when neither the ERC-20 log nor the native transfer match", async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [] });
    mockGetTransaction.mockResolvedValue({ to: "0xUnrelated", value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 3.25);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no matching/i);
  });

  it("ignores logs from unrelated contracts even if they happen to decode", async () => {
    const log = buildTransferLog(PAYER, RECIPIENT, 10.5);
    const unrelatedLog = { ...log, address: "0x9999999999999999999999999999999999999a" as Address };
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", logs: [unrelatedLog] });
    mockGetTransaction.mockResolvedValue({ to: "0xSomeOtherContract", value: 0n, from: PAYER });
    const result = await verifyPayment(TX_HASH, RECIPIENT, 10.5);
    expect(result.ok).toBe(false);
  });
});
