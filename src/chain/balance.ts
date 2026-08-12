import { formatUnits } from "viem";
import { arcClient } from "./arcClient.js";
import { USDC_ERC20_INTERFACE_ADDRESS, NATIVE_USDC_DECIMALS, ERC20_USDC_DECIMALS, EURC_ADDRESS } from "./constants.js";
import type { WalletBalance } from "../core/types.js";

/** Minimal ERC-20 ABI — just balanceOf, since that's all we need here. */
const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Reads BOTH representations of an address's USDC balance on Arc — the
 * native balance (18-dec, gas-accounting precision) and the ERC-20
 * interface's view of the same balance (6-dec, application precision).
 * They should always reconcile to the same USDC amount — reading both is a
 * useful sanity check, not redundant work.
 */
export async function getWalletBalance(address: `0x${string}`): Promise<WalletBalance> {
  const [nativeWei, erc20Raw, eurcRaw] = await Promise.all([
    arcClient.getBalance({ address }),
    arcClient.readContract({
      address: USDC_ERC20_INTERFACE_ADDRESS,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    arcClient.readContract({
      address: EURC_ADDRESS,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
  ]);
  return {
    address,
    nativeUsdc: Number(formatUnits(nativeWei, NATIVE_USDC_DECIMALS)),
    erc20Usdc: Number(formatUnits(erc20Raw, ERC20_USDC_DECIMALS)),
    // EURC is a standard 6-decimal ERC-20 (confirmed via the Arc Swap pair reserves earlier).
    eurc: Number(formatUnits(eurcRaw, ERC20_USDC_DECIMALS)),
  };
}
