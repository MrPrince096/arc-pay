import { describe, it, expect } from "vitest";
import { checkSpendAllowed, todaysTotal } from "../src/agent/spendCap.js";
import type { AgentSpendEntry } from "../src/core/types.js";

function entry(amountUsdc: number, timestamp: number): AgentSpendEntry {
  return { id: "x", amountUsdc, action: "test", txHash: "0xabc", timestamp };
}

describe("todaysTotal", () => {
  it("sums only entries from today (UTC calendar day)", () => {
    const now = Date.now();
    const yesterday = now - 25 * 60 * 60 * 1000;
    const log = [entry(1, now), entry(2, now), entry(5, yesterday)];
    expect(todaysTotal(log)).toBe(3);
  });

  it("returns 0 for an empty log", () => {
    expect(todaysTotal([])).toBe(0);
  });
});

describe("checkSpendAllowed", () => {
  const caps = { maxPerActionUsdc: 0.01, dailyCapUsdc: 1.0 };

  it("allows a small amount within both caps", () => {
    const result = checkSpendAllowed(0.005, [], caps);
    expect(result.allowed).toBe(true);
  });

  it("rejects an amount exceeding the per-action cap, even with no prior spend", () => {
    const result = checkSpendAllowed(0.02, [], caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/per-action cap/);
  });

  it("rejects an amount that would push today's total over the daily cap", () => {
    const now = Date.now();
    const log = [entry(0.01, now), entry(0.01, now), entry(0.01, now)];
    // 3 * 0.01 = 0.03 spent already; this project's default caps in .env.example are
    // 0.01/action and 1.00/day, but here we use a tight daily cap to exercise the path.
    const tightCaps = { maxPerActionUsdc: 0.01, dailyCapUsdc: 0.035 };
    const result = checkSpendAllowed(0.01, log, tightCaps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/daily cap/);
  });

  it("allows an amount that exactly reaches (not exceeds) the daily cap", () => {
    const log = [entry(0.5, Date.now())];
    const result = checkSpendAllowed(0.5, log, { maxPerActionUsdc: 1, dailyCapUsdc: 1.0 });
    expect(result.allowed).toBe(true);
  });

  it("ignores yesterday's spend when computing today's total against the cap", () => {
    const yesterday = Date.now() - 25 * 60 * 60 * 1000;
    const log = [entry(0.99, yesterday)];
    const result = checkSpendAllowed(0.01, log, caps);
    expect(result.allowed).toBe(true);
  });

  it("reports the running total in the result even when allowed", () => {
    const log = [entry(0.003, Date.now())];
    const result = checkSpendAllowed(0.005, log, caps);
    expect(result.todaysTotalUsdc).toBeCloseTo(0.003, 6);
  });
});
