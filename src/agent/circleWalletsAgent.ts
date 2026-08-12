import { AppKit, type BridgeStep } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { checkSpendAllowed } from "./spendCap.js";
import { listSpend, recordSpend } from "../server/agentSpendStore.js";

export interface AgentActionResult {
  willSend: boolean;
  sent: boolean;
  txHash?: string;
  description: string;
}

const kit = new AppKit();

function getCaps() {
  return {
    maxPerActionUsdc: Number(process.env.AGENT_MAX_SPEND_PER_ACTION_USDC) || 0.01,
    dailyCapUsdc: Number(process.env.AGENT_DAILY_SPEND_CAP_USDC) || 1.0,
  };
}

/**
 * Performs one gated, autonomous USDC payment — the "agent pays" demo.
 * Layered exactly like the sibling Crypto auto project's live brokers
 * (`EvmBroker`, `JupiterBroker`): dry-run by default, real send requires
 * ALL of an explicit `AGENT_LIVE_CONFIRM=I_UNDERSTAND`, real Circle
 * credentials, and a configured agent wallet address — PLUS an additional
 * spend-cap gate checked FIRST, so a capped amount never even reaches the
 * point of constructing a real Circle Wallets adapter (no credentials
 * needed at all for a rejected or dry-run action).
 */
export async function performGatedAction(amountUsdc: number, action: string, to: string): Promise<AgentActionResult> {
  const caps = getCaps();
  const log = await listSpend();
  const check = checkSpendAllowed(amountUsdc, log, caps);
  if (!check.allowed) {
    return { willSend: false, sent: false, description: `Refused: ${check.reason}` };
  }

  const liveConfirmed = process.env.AGENT_LIVE_CONFIRM === "I_UNDERSTAND";
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const agentAddress = process.env.AGENT_WALLET_ADDRESS;
  const willSend = liveConfirmed && !!apiKey && !!entitySecret && !!agentAddress;

  if (!willSend) {
    return {
      willSend: false,
      sent: false,
      description:
        `DRY-RUN — would send $${amountUsdc} to ${to} for "${action}" (spend cap OK, $${check.todaysTotalUsdc.toFixed(6)} spent today) — ` +
        "nothing sent (set AGENT_LIVE_CONFIRM=I_UNDERSTAND + CIRCLE_API_KEY/CIRCLE_ENTITY_SECRET/AGENT_WALLET_ADDRESS to send).",
    };
  }

  const adapter = createCircleWalletsAdapter({ apiKey: apiKey!, entitySecret: entitySecret! });
  const step: BridgeStep = await kit.send({
    from: { adapter, chain: "Arc_Testnet", address: agentAddress as `0x${string}` },
    to,
    amount: String(amountUsdc),
    token: "USDC",
  });
  if (step.state !== "success" || !step.txHash) {
    throw new Error(step.errorMessage || `Agent send did not complete (state: ${step.state}).`);
  }
  await recordSpend({ amountUsdc, action, txHash: step.txHash });
  return {
    willSend: true,
    sent: true,
    txHash: step.txHash,
    description: `🔴 LIVE SEND — sent $${amountUsdc} to ${to} for "${action}". REAL FUNDS MOVED.`,
  };
}
