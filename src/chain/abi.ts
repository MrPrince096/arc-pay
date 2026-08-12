import { parseAbiItem } from "viem";

/** Shared ABI fragments — kept in one place so txHistory.ts and payments.ts decode the exact same event shape. */
export const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
