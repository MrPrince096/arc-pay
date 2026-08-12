/**
 * One-time setup: creates a Circle-managed wallet set + a single wallet on
 * Arc Testnet (blockchain "ARC-TESTNET" — confirmed real by inspecting the
 * SDK's compiled Blockchain enum), then writes the resulting address into
 * `.env` as AGENT_WALLET_ADDRESS. This is the wallet the agent-pays demo
 * signs from via Circle's developer-controlled wallet adapter — it must be
 * a wallet Circle's own system created and controls, not an arbitrary
 * externally-owned address.
 *
 *   npx tsx scripts/create-agent-wallet.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

try {
  process.loadEnvFile();
} catch {
  // fine — the checks below will catch missing values.
}

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
if (!apiKey || !entitySecret) {
  console.error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must both be set in .env first.");
  process.exit(1);
}

const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

const walletSetResponse = await client.createWalletSet({ name: "Arc Pay Agent" });
const walletSetId = walletSetResponse.data?.walletSet?.id;
if (!walletSetId) throw new Error("Wallet set creation did not return an id.");
console.log("Created wallet set:", walletSetId);

const walletsResponse = await client.createWallets({
  blockchains: ["ARC-TESTNET"],
  count: 1,
  walletSetId,
});
const wallet = walletsResponse.data?.wallets?.[0];
if (!wallet?.address) throw new Error("Wallet creation did not return an address.");

console.log("Created agent wallet:", wallet.address);

const envPath = ".env";
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const line = `AGENT_WALLET_ADDRESS=${wallet.address}`;
const updated = /^AGENT_WALLET_ADDRESS=.*$/m.test(existing)
  ? existing.replace(/^AGENT_WALLET_ADDRESS=.*$/m, line)
  : existing.trimEnd() + `\n${line}\n`;
writeFileSync(envPath, updated);

console.log("Written to .env as AGENT_WALLET_ADDRESS.");
console.log(`Fund it at https://faucet.circle.com before setting AGENT_LIVE_CONFIRM=I_UNDERSTAND.`);
