import { arcClient } from "./arcClient.js";
import { ARC_NFT_CONTRACT_ADDRESS } from "./constants.js";
import { NFT_ABI } from "./nftArtifact.js";

export interface NftStats {
  contractAddress: string;
  name: string;
  symbol: string;
  totalSupply: number;
  maxSupply: number;
  maxPerWallet: number;
  /** Only populated when an address is passed in. */
  mintedByYou?: number;
}

export async function getNftStats(address?: `0x${string}`): Promise<NftStats> {
  const [name, symbol, totalSupply, maxSupply, maxPerWallet, mintedByYou] = await Promise.all([
    arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "name" }),
    arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "symbol" }),
    arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "totalSupply" }),
    arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "MAX_SUPPLY" }),
    arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "MAX_PER_WALLET" }),
    address
      ? arcClient.readContract({ address: ARC_NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "mintedBy", args: [address] })
      : Promise.resolve(undefined),
  ]);
  return {
    contractAddress: ARC_NFT_CONTRACT_ADDRESS,
    name,
    symbol,
    totalSupply: Number(totalSupply),
    maxSupply: Number(maxSupply),
    maxPerWallet: Number(maxPerWallet),
    mintedByYou: mintedByYou !== undefined ? Number(mintedByYou) : undefined,
  };
}
