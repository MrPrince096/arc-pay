/**
 * One-time setup: generates a random entity secret, registers it with Circle
 * via their official SDK (RSA-encrypts it against Circle's public key under
 * the hood), saves the recovery file, and writes the secret straight into
 * `.env` — the plaintext value is never printed to the terminal.
 *
 *   npx tsx scripts/register-entity-secret.ts
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

try {
  process.loadEnvFile();
} catch {
  // .env may not exist yet — fine, CIRCLE_API_KEY check below will catch it.
}

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  console.error("CIRCLE_API_KEY is not set in .env — set it first.");
  process.exit(1);
}

const entitySecret = randomBytes(32).toString("hex");

const response = await registerEntitySecretCiphertext({ apiKey, entitySecret });

mkdirSync("recovery", { recursive: true });
const recoveryPath = `recovery/entity-secret-recovery-${Date.now()}.dat`;
writeFileSync(recoveryPath, response.data?.recoveryFile ?? "");

const envPath = ".env";
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const line = `CIRCLE_ENTITY_SECRET=${entitySecret}`;
const updated = /^CIRCLE_ENTITY_SECRET=.*$/m.test(existing)
  ? existing.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, line)
  : existing.trimEnd() + `\n${line}\n`;
writeFileSync(envPath, updated);

console.log("Entity secret registered with Circle and written to .env (CIRCLE_ENTITY_SECRET).");
console.log(`Preview: ${entitySecret.slice(0, 8)}...${entitySecret.slice(-4)}`);
console.log(`Recovery file saved to ${recoveryPath} — back this up somewhere safe (password manager, etc).`);
console.log("It's the ONLY way to reset the entity secret if you ever lose it.");
