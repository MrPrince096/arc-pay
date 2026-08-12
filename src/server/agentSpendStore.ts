import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./jsonStore.js";
import type { AgentSpendEntry } from "../core/types.js";

const SPEND_FILE = "agent-spend.json";

export async function listSpend(): Promise<AgentSpendEntry[]> {
  return readJson<AgentSpendEntry[]>(SPEND_FILE, []);
}

/** Append-only — called ONLY after a real send has already succeeded, never speculatively before. */
export async function recordSpend(params: { amountUsdc: number; action: string; txHash: string }): Promise<AgentSpendEntry> {
  const entry: AgentSpendEntry = {
    id: randomUUID(),
    amountUsdc: params.amountUsdc,
    action: params.action,
    txHash: params.txHash,
    timestamp: Date.now(),
  };
  const log = await listSpend();
  log.push(entry);
  await writeJson(SPEND_FILE, log);
  return entry;
}
