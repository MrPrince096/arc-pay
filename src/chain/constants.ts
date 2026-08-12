/**
 * Arc testnet constants — every value here was verified directly this
 * session (live `eth_chainId`/`eth_blockNumber` RPC calls, and Circle's own
 * docs at docs.arc.io), not assumed from training data. Arc launched
 * mainnet only weeks before this was written, so treat any value NOT
 * verified here with suspicion.
 */

export const ARC_CHAIN_ID = Number(process.env.ARC_CHAIN_ID) || 5042002;
export const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";
export const ARC_WS_URL = process.env.ARC_WS_URL || "wss://rpc.testnet.arc.io";
export const ARC_EXPLORER_URL = process.env.ARC_EXPLORER_URL || "https://testnet.arcscan.app";

/**
 * The native balance (`eth_getBalance`) on Arc IS the USDC balance, at
 * 18-decimal precision (used for gas accounting). This ERC-20 interface
 * contract exposes the SAME underlying balance at the standard 6-decimal
 * USDC precision, for application-level transfers/display — not a second
 * token, just a second view onto one balance.
 */
export const USDC_ERC20_INTERFACE_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const NATIVE_USDC_DECIMALS = 18;
export const ERC20_USDC_DECIMALS = 6;

/** Deployed at the same deterministic address on every EVM chain (CREATE2). Used as a "chain is real and has real contracts" smoke-test target. */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

/** Fee bounds Circle documents for testnet — a maxFeePerGas below the floor may hang or fail. */
export const MIN_GAS_PRICE_GWEI = 20;
export const MAX_GAS_PRICE_GWEI = 20_000;

/** The chain name string App Kit's `kit.send()` expects for `from.chain`. */
export const APP_KIT_CHAIN_NAME = "Arc_Testnet" as const;

/**
 * EURC on Arc Testnet — confirmed as `token1` of the Arc Swap USDC/EURC pair
 * (see ARC_SWAP_* below) by reading the pair contract's own `token1()` live.
 */
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

/**
 * Arc Swap — a Uniswap V2 fork deployed on Arc Testnet by a community
 * contributor (not an official Circle deployment), submitted via
 * https://github.com/circlefin/arc-node/issues/160. Confirmed real by
 * reading live bytecode at each address and real, non-zero USDC/EURC
 * reserves via `getReserves()` — not used directly by this app (App Kit's
 * own `kit.swap()`/`kit.estimateSwap()` handles routing internally, and a
 * live quote confirms it works on Arc_Testnet), kept here for reference
 * since it's very likely what App Kit routes through under the hood.
 */
export const ARC_SWAP_FACTORY_ADDRESS = "0x7483847d46db2920dd64efa676cf72dcf765814f" as const;
export const ARC_SWAP_ROUTER_ADDRESS = "0xe27d5d256b370604f1ff060fb489c6a8e3f8a6d9" as const;
export const ARC_SWAP_USDC_EURC_PAIR_ADDRESS = "0xb3685D16AAa06361ED28377b1319136650Fa9A13" as const;
