// src/lib/web3/ethers.ts
import { ethers } from 'ethers';
import { getWalletClient } from '@wagmi/core';
import { config } from '@/configs'; // your wagmi config

export async function getEthersSigner() {
  const walletClient = await getWalletClient(config);
  if (!walletClient) throw new Error('Wallet not connected');
  const { account, chain, transport } = walletClient;
  const provider = new ethers.BrowserProvider(transport as any, chain.id);
  return provider.getSigner(account.address);
}

export const provider = new ethers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_BLOCKDAG_TESTNET_RPC
);