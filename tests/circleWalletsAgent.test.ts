import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListSpend = vi.fn();
const mockRecordSpend = vi.fn();
vi.mock("../src/server/agentSpendStore.js", () => ({
  listSpend: () => mockListSpend(),
  recordSpend: (...args: unknown[]) => mockRecordSpend(...args),
}));

const mockCreateAdapter = vi.fn();
vi.mock("@circle-fin/adapter-circle-wallets", () => ({
  createCircleWalletsAdapter: (...args: unknown[]) => mockCreateAdapter(...args),
}));

const mockSend = vi.fn();
vi.mock("@circle-fin/app-kit", () => ({
  AppKit: class {
    send = (...args: unknown[]) => mockSend(...args);
  },
}));

const { performGatedAction } = await import("../src/agent/circleWalletsAgent.js");

const ENV_KEYS = [
  "AGENT_LIVE_CONFIRM", "CIRCLE_API_KEY", "CIRCLE_ENTITY_SECRET", "AGENT_WALLET_ADDRESS",
  "AGENT_MAX_SPEND_PER_ACTION_USDC", "AGENT_DAILY_SPEND_CAP_USDC",
];

beforeEach(() => {
  mockListSpend.mockReset().mockResolvedValue([]);
  mockRecordSpend.mockReset();
  mockCreateAdapter.mockReset();
  mockSend.mockReset();
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("performGatedAction", () => {
  it("rejects an over-cap amount without ever touching Circle's SDK", async () => {
    process.env.AGENT_MAX_SPEND_PER_ACTION_USDC = "0.01";
    const result = await performGatedAction(1, "test", "0xRecipient");
    expect(result.willSend).toBe(false);
    expect(result.sent).toBe(false);
    expect(result.description).toMatch(/Refused/);
    expect(mockCreateAdapter).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("stays dry-run with no live-confirm gate set, even with valid credentials present", async () => {
    process.env.CIRCLE_API_KEY = "key";
    process.env.CIRCLE_ENTITY_SECRET = "secret";
    process.env.AGENT_WALLET_ADDRESS = "0xAgent";
    const result = await performGatedAction(0.005, "test", "0xRecipient");
    expect(result.willSend).toBe(false);
    expect(result.description).toMatch(/DRY-RUN/);
    expect(mockCreateAdapter).not.toHaveBeenCalled();
  });

  it("stays dry-run when confirmed but credentials are missing", async () => {
    process.env.AGENT_LIVE_CONFIRM = "I_UNDERSTAND";
    const result = await performGatedAction(0.005, "test", "0xRecipient");
    expect(result.willSend).toBe(false);
    expect(mockCreateAdapter).not.toHaveBeenCalled();
  });

  it("sends live when the cap allows it, confirmed, and credentials are present — then records the spend", async () => {
    process.env.AGENT_LIVE_CONFIRM = "I_UNDERSTAND";
    process.env.CIRCLE_API_KEY = "key";
    process.env.CIRCLE_ENTITY_SECRET = "secret";
    process.env.AGENT_WALLET_ADDRESS = "0xAgent";
    mockCreateAdapter.mockReturnValue({ mock: "adapter" });
    mockSend.mockResolvedValue({ state: "success", txHash: "0xTxHash" });

    const result = await performGatedAction(0.005, "unlock-content", "0xRecipient");

    expect(result.willSend).toBe(true);
    expect(result.sent).toBe(true);
    expect(result.txHash).toBe("0xTxHash");
    expect(mockCreateAdapter).toHaveBeenCalledWith({ apiKey: "key", entitySecret: "secret" });
    expect(mockRecordSpend).toHaveBeenCalledWith({ amountUsdc: 0.005, action: "unlock-content", txHash: "0xTxHash" });
  });

  it("throws (and does not record spend) when the send doesn't succeed", async () => {
    process.env.AGENT_LIVE_CONFIRM = "I_UNDERSTAND";
    process.env.CIRCLE_API_KEY = "key";
    process.env.CIRCLE_ENTITY_SECRET = "secret";
    process.env.AGENT_WALLET_ADDRESS = "0xAgent";
    mockCreateAdapter.mockReturnValue({ mock: "adapter" });
    mockSend.mockResolvedValue({ state: "error", errorMessage: "user rejected" });

    await expect(performGatedAction(0.005, "test", "0xRecipient")).rejects.toThrow(/user rejected/);
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });
});
