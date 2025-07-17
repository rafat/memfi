// src/hooks/useUserWallet.ts

import { usePublicClient } from 'wagmi';
import useSWR from 'swr';
import { Address, erc20Abi, createPublicClient, http } from 'viem'; // <<< FIX: Import from viem
import { BDAG_TESTNET } from '@/lib/contracts';
import { blockdagPrimordial } from '@/chains'; // <<< FIX: Import your chain definition

const TOKENS = BDAG_TESTNET.tokens;
const CHAIN_ID = BDAG_TESTNET.chainId;

// Type definition for wallet balances
export type WalletBalances = {
  meth: bigint;
  mbtc: bigint;
  native: bigint; // For BDAG itself
};

/**
 * Creates a fetcher function that can be used by the backend AI Agent.
 * This is a raw, non-reactive function to get wallet data, using viem directly.
 */
export function createUserWalletFetcher() {
  // <<< FIX: Use viem's createPublicClient for server-side contexts.
  const publicClient = createPublicClient({
    chain: blockdagPrimordial, // Pass the full chain object
    transport: http(BDAG_TESTNET.rpc),
  });

  const getBalances = async (userAddress: Address): Promise<WalletBalances> => {
    // The Promise.all logic is correct and remains the same.
    const [methBalance, mbtcBalance, nativeBalance] = await Promise.all([
      publicClient.readContract({
        address: TOKENS.METH as Address,
        abi: erc20Abi, // viem provides a generic ERC20 ABI
        functionName: 'balanceOf',
        args: [userAddress],
      }),
      publicClient.readContract({
        address: TOKENS.MBTC as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      }),
      publicClient.getBalance({ address: userAddress }),
    ]);

    return {
      meth: methBalance,
      mbtc: mbtcBalance,
      native: nativeBalance,
    };
  };
  
  const getBalanceOf = async (userAddress: Address, tokenAddress: Address): Promise<bigint> => {
    return publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
    });
  }

  return { getBalances, getBalanceOf };
}


/**
 * A reactive SWR hook for displaying user balances on the frontend.
 * This hook correctly uses the wagmi `usePublicClient` hook.
 */
export function useUserWallet(userAddress?: Address) {
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  
  const fetcher = async (): Promise<WalletBalances | null> => {
    if (!publicClient || !userAddress) return null;
    
    // The SWR fetcher can now directly use the publicClient from the hook.
    const [methBalance, mbtcBalance, nativeBalance] = await Promise.all([
        publicClient.readContract({
          address: TOKENS.METH as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        }),
        publicClient.readContract({
          address: TOKENS.MBTC as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        }),
        publicClient.getBalance({ address: userAddress }),
      ]);
  
      return {
        meth: methBalance,
        mbtc: mbtcBalance,
        native: nativeBalance,
      };
  };

  return useSWR(
    userAddress ? `wallet-balances-${userAddress}` : null,
    fetcher,
    { refreshInterval: 5000 } // Refresh every 5 seconds
  );
}