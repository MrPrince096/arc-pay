import { decodeEventLog, formatUnits } from "viem";
import { arcClient } from "./arcClient.js";
import { TRANSFER_EVENT } from "./abi.js";
import { USDC_ERC20_INTERFACE_ADDRESS, ERC20_USDC_DECIMALS, NATIVE_USDC_DECIMALS } from "./constants.js";

export interface PaymentVerification {
  ok: boolean;
  payerAddress?: string;
  reason?: string;
}

const AMOUNT_TOLERANCE_USDC = 0.000001;

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < AMOUNT_TOLERANCE_USDC;
}

/**
 * Independently verifies a payment on-chain — never trust a client-reported
 * "I paid" claim. Checks BOTH possible transfer shapes, since it's not yet
 * confirmed which one App Kit's `kit.send({token:'USDC'})` actually uses
 * (flagged in txHistory.ts too, to verify with one real send):
 *   1. An ERC-20 `transfer()` on the USDC interface contract (a decoded
 *      Transfer event with matching `to` + amount).
 *   2. A bare native-value transfer (Arc's native balance IS USDC at
 *      18-dec) directly to the recipient.
 * Either one, if it matches the invoice's recipient and amount, is accepted
 * — this makes verification correct regardless of which path turns out to
 * be real, rather than betting on one assumption.
 */
export async function verifyPayment(
  txHash: `0x${string}`,
  expectedRecipient: string,
  expectedAmountUsdc: number,
): Promise<PaymentVerification> {
  const [receipt, tx] = await Promise.all([
    arcClient.getTransactionReceipt({ hash: txHash }),
    arcClient.getTransaction({ hash: txHash }),
  ]);

  if (receipt.status !== "success") {
    return { ok: false, reason: "Transaction did not succeed on-chain." };
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== USDC_ERC20_INTERFACE_ADDRESS.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      if (decoded.eventName !== "Transfer") continue;
      const { to, from, value } = decoded.args;
      if (to.toLowerCase() !== expectedRecipient.toLowerCase()) continue;
      const amount = Number(formatUnits(value, ERC20_USDC_DECIMALS));
      if (amountsMatch(amount, expectedAmountUsdc)) return { ok: true, payerAddress: from };
    } catch {
      // Not a Transfer-shaped log on this contract — skip.
    }
  }

  if (tx.to && tx.to.toLowerCase() === expectedRecipient.toLowerCase()) {
    const amount = Number(formatUnits(tx.value, NATIVE_USDC_DECIMALS));
    if (amountsMatch(amount, expectedAmountUsdc)) return { ok: true, payerAddress: tx.from };
  }

  return { ok: false, reason: "No matching USDC payment to the invoice recipient was found in this transaction." };
}
