import { createPublicClient, http, defineChain } from "viem";
import { NFT_ABI } from "../src/chain/nftArtifact.js";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  testnet: true,
});
const client = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.io") });
const addr = "0x6019a0900a73d5bf6294f3f5bbb27e99202610cf" as const;

const [name, symbol, maxSupply, maxPerWallet, totalSupply] = await Promise.all([
  client.readContract({ address: addr, abi: NFT_ABI, functionName: "name" }),
  client.readContract({ address: addr, abi: NFT_ABI, functionName: "symbol" }),
  client.readContract({ address: addr, abi: NFT_ABI, functionName: "MAX_SUPPLY" }),
  client.readContract({ address: addr, abi: NFT_ABI, functionName: "MAX_PER_WALLET" }),
  client.readContract({ address: addr, abi: NFT_ABI, functionName: "totalSupply" }),
]);
console.log({ name, symbol, maxSupply, maxPerWallet, totalSupply });
