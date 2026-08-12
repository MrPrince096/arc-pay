import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, http, defineChain } from "viem";
import { NFT_ABI } from "../src/chain/nftArtifact.js";

try {
  process.loadEnvFile();
} catch {
  // env checks below cover missing values
}

const apiKey = process.env.CIRCLE_API_KEY!;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;
const agentAddress = process.env.AGENT_WALLET_ADDRESS!;
const nftAddress = "0x6019a0900a73d5bf6294f3f5bbb27e99202610cf";

const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

const res = await client.createContractExecutionTransaction({
  walletAddress: agentAddress,
  blockchain: "ARC-TESTNET",
  contractAddress: nftAddress,
  abiFunctionSignature: "mint()",
  abiParameters: [],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});
console.log("Transaction submitted:", JSON.stringify(res.data, null, 2));

const txId = res.data?.id;
if (!txId) throw new Error("No transaction id returned.");

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  testnet: true,
});
const publicClient = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.io") });

console.log("Polling Circle for the tx hash...");
let txHash: `0x${string}` | undefined;
for (let i = 0; i < 30; i++) {
  const tx = await client.getTransaction({ id: txId });
  const state = tx.data?.transaction?.state;
  const hash = tx.data?.transaction?.txHash;
  console.log(`  state=${state} hash=${hash ?? "-"}`);
  if (hash) {
    txHash = hash as `0x${string}`;
    if (state === "CONFIRMED" || state === "COMPLETE") break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}

if (!txHash) throw new Error("No tx hash after polling.");
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log("Receipt status:", receipt.status, "block:", receipt.blockNumber);

const totalSupply = await publicClient.readContract({ address: nftAddress, abi: NFT_ABI, functionName: "totalSupply" });
const owner = await publicClient.readContract({ address: nftAddress, abi: NFT_ABI, functionName: "ownerOf", args: [totalSupply] });
console.log("New totalSupply:", totalSupply, "owner of that token:", owner);
