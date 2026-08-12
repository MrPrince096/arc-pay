import type { AgentSpendEntry } from "../core/types.js";

export interface SpendCaps {
  maxPerActionUsdc: number;
  dailyCapUsdc: number;
}

export interface SpendCheck {
  allowed: boolean;
  reason?: string;
  todaysTotalUsdc: number;
}

/** UTC-calendar-day bucket, for auditability — matches when a human reading the log would call it "today." */
function isToday(timestamp: number): boolean {
  return new Date(timestamp).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function todaysTotal(log: AgentSpendEntry[]): number {
  return log.filter((e) => isToday(e.timestamp)).reduce((sum, e) => sum + e.amountUsdc, 0);
}

/**
 * Pure, testable spend-cap check — mirrors the sibling Crypto auto
 * project's riskManager.ts style. Checked BEFORE any of the broker-style
 * live-send gates (confirm env var + credentials) — a rejected amount never
 * even reaches the point of constructing a real Circle Wallets adapter.
 */
export function checkSpendAllowed(amountUsdc: number, log: AgentSpendEntry[], caps: SpendCaps): SpendCheck {
  const todaysTotalUsdc = todaysTotal(log);
  if (amountUsdc > caps.maxPerActionUsdc) {
    return {
      allowed: false,
      reason: `$${amountUsdc} exceeds the per-action cap of $${caps.maxPerActionUsdc}.`,
      todaysTotalUsdc,
    };
  }
  if (todaysTotalUsdc + amountUsdc > caps.dailyCapUsdc) {
    return {
      allowed: false,
      reason: `This would exceed the daily cap of $${caps.dailyCapUsdc} (already spent $${todaysTotalUsdc.toFixed(6)} today).`,
      todaysTotalUsdc,
    };
  }
  return { allowed: true, todaysTotalUsdc };
}
