/**
 * Live RPC connectivity smoke test.
 *
 *   pnpm check
 *
 * Confirms the Arc testnet RPC is reachable, reports the real chain id and
 * current block height (not a cached/stale value), and confirms known
 * contracts actually have deployed bytecode — a real "is this chain alive"
 * check, not just "did the HTTP request not throw."
 */
import "../core/loadEnv.js";
import { arcClient } from "../chain/arcClient.js";
import { ARC_CHAIN_ID, ARC_RPC_URL, MULTICALL3_ADDRESS, USDC_ERC20_INTERFACE_ADDRESS } from "../chain/constants.js";

async function main(): Promise<void> {
  console.log(`Checking Arc testnet connectivity (${ARC_RPC_URL})...\n`);
  let ok = true;

  const chainId = await arcClient.getChainId();
  const chainIdOk = chainId === ARC_CHAIN_ID;
  ok &&= chainIdOk;
  console.log(`chainId: ${chainId} ${chainIdOk ? "✅ matches expected" : `❌ MISMATCH (expected ${ARC_CHAIN_ID})`}`);

  const blockNumber = await arcClient.getBlockNumber();
  console.log(`blockNumber: ${blockNumber}`);

  const multicallCode = await arcClient.getCode({ address: MULTICALL3_ADDRESS });
  const multicallOk = !!multicallCode && multicallCode !== "0x";
  ok &&= multicallOk;
  console.log(`Multicall3 (${MULTICALL3_ADDRESS}) bytecode: ${multicallOk ? "✅ present" : "❌ MISSING"}`);

  const usdcCode = await arcClient.getCode({ address: USDC_ERC20_INTERFACE_ADDRESS });
  const usdcOk = !!usdcCode && usdcCode !== "0x";
  ok &&= usdcOk;
  console.log(`USDC ERC-20 interface (${USDC_ERC20_INTERFACE_ADDRESS}) bytecode: ${usdcOk ? "✅ present" : "❌ MISSING"}`);

  if (!ok) {
    console.error("\n❌ Connectivity check FAILED.");
    process.exit(1);
  }
  console.log("\n✅ All checks passed — Arc testnet is live and reachable.");
}

main().catch((e) => {
  console.error("Check failed:", e);
  process.exit(1);
});
