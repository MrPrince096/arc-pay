import { formatUnits } from "viem";
import { arcClient } from "./arcClient.js";
import { USDC_ERC20_INTERFACE_ADDRESS, ERC20_USDC_DECIMALS } from "./constants.js";
import { TRANSFER_EVENT } from "./abi.js";
import type { TxSummary } from "../core/types.js";

/**
 * Transfer-event history for `address` (as sender or receiver), scanning
 * the last `blockRange` blocks on the ERC-20 USDC interface contract.
 *
 * `blockRange` default (10,000) is an empirically-verified safe value, not
 * a guess: a live `eth_getLogs` call against this exact RPC with a 20,000-
 * block range succeeded, and a 50,000-block range failed with "requested
 * range too large" (error -32012) — 10,000 leaves real headroom under that
 * limit rather than hugging it.
 *
 * CONFIRMED (via a real live send, tx 0x43ae2b8b...a2c43c6f7 on Arc
 * Testnet): App Kit's `kit.send({token:'USDC', ...})` calls the ERC-20
 * interface's `transfer()` — the receipt's `to` was the ERC-20 interface
 * address itself, not a bare native-value transfer. This is no longer an
 * assumption.
 */
export async function getTxHistory(address: `0x${string}`, blockRange = 10_000n): Promise<TxSummary[]> {
  const latest = await arcClient.getBlockNumber();
  const fromBlock = latest > blockRange ? latest - blockRange : 0n;

  const [sent, received] = await Promise.all([
    arcClient.getLogs({ address: USDC_ERC20_INTERFACE_ADDRESS, event: TRANSFER_EVENT, args: { from: address }, fromBlock, toBlock: latest }),
    arcClient.getLogs({ address: USDC_ERC20_INTERFACE_ADDRESS, event: TRANSFER_EVENT, args: { to: address }, fromBlock, toBlock: latest }),
  ]);

  const seen = new Set<string>();
  const deduped = [...sent, ...received].filter((log) => {
    const key = `${log.transactionHash}:${log.logIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const summaries: TxSummary[] = deduped
    .filter((log) => log.args.from && log.args.to && log.args.value !== undefined)
    .map((log) => ({
      hash: log.transactionHash,
      from: log.args.from!,
      to: log.args.to!,
      amountUsdc: Number(formatUnits(log.args.value!, ERC20_USDC_DECIMALS)),
      blockNumber: Number(log.blockNumber),
    }));

  return summaries.sort((a, b) => b.blockNumber - a.blockNumber);
}
