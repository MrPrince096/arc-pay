/**
 * One-time deployment: generates a fresh local deployer key, funds it with
 * a small amount of USDC from the agent wallet (direct Circle Wallets
 * send — deliberately bypassing the agent demo's spend-cap gate, since
 * this is infrastructure setup, not an "agent action"), then deploys
 * ArcPayDemoNFT via plain viem using that funded key.
 *
 *   npx tsx scripts/deploy-nft.ts
 */
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { NFT_ABI, NFT_BYTECODE } from "../src/chain/nftArtifact.js";

try {
  process.loadEnvFile();
} catch {
  // handled by the env checks below
}

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const agentAddress = process.env.AGENT_WALLET_ADDRESS;
if (!apiKey || !entitySecret || !agentAddress) {
  console.error("CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, and AGENT_WALLET_ADDRESS must all be set in .env.");
  process.exit(1);
}

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

const publicClient = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.io") });

async function main() {
  const deployerKey = generatePrivateKey();
  const deployerAccount = privateKeyToAccount(deployerKey);
  console.log("Generated deployer address:", deployerAccount.address);

  console.log("Funding deployer with 2 USDC from the agent wallet...");
  const kit = new AppKit();
  const adapter = createCircleWalletsAdapter({ apiKey: apiKey!, entitySecret: entitySecret! });
  const step = await kit.send({
    from: { adapter, chain: "Arc_Testnet", address: agentAddress as `0x${string}` },
    to: deployerAccount.address,
    amount: "2",
    token: "USDC",
  });
  if (step.state !== "success" || !step.txHash) {
    throw new Error(`Funding send failed: ${step.errorMessage || step.state}`);
  }
  console.log("Funded. tx:", step.txHash);

  console.log("Waiting for deployer balance to reflect the funding...");
  for (let i = 0; i < 20; i++) {
    const bal = await publicClient.getBalance({ address: deployerAccount.address });
    if (bal > 0n) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("Deploying ArcPayDemoNFT...");
  const walletClient = createWalletClient({ account: deployerAccount, chain: arcTestnet, transport: http("https://rpc.testnet.arc.io") });
  const deployTxHash = await walletClient.deployContract({ abi: NFT_ABI, bytecode: NFT_BYTECODE, args: [] });
  console.log("Deploy tx:", deployTxHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`Deployment failed (status: ${receipt.status}).`);
  }
  console.log("Deployed at:", receipt.contractAddress);

  const bytecode = await publicClient.getCode({ address: receipt.contractAddress });
  console.log("Bytecode present at deployed address:", !!bytecode && bytecode !== "0x");

  console.log("\nAdd this to .env / constants:");
  console.log(`ARC_NFT_CONTRACT_ADDRESS=${receipt.contractAddress}`);
}

main().catch((e) => {
  console.error("Deploy failed:", e);
  process.exit(1);
});
