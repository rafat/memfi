// src/hooks/useFaucet.ts
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, type WriteContractParameters } from 'viem'; // <<< Import the type
import { BDAG_TESTNET } from '@/lib/contracts';
import { Faucet_ABI } from '@/lib/contracts/abis';
import { Address } from 'viem';
import { blockdagPrimordial } from '../chains';

const FAUCET_ADDRESS = BDAG_TESTNET.contracts.Faucet as Address;
const CLAIM_FEE = parseEther("0.1");

export function useFaucet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const { data: hash, isPending, error, writeContractAsync } = useWriteContract();

  const { data: nextClaimTime, refetch: refetchClaimTime } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: Faucet_ABI,
    functionName: 'nextClaimTime',
    args: [address!],
    query: {
      enabled: !!address,
    }
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  useEffect(() => {
    if (nextClaimTime) {
      const interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Number(nextClaimTime) - now;
        setCooldownRemaining(remaining > 0 ? remaining : 0);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [nextClaimTime]);
  
  useEffect(() => {
    if (isConfirmed) {
      refetchClaimTime();
    }
  }, [isConfirmed, refetchClaimTime]);

  const claimTokens = async () => {
    try {
      // <<< FIX: Construct the request object with an explicit type
      const request: WriteContractParameters = {
        address: FAUCET_ADDRESS,
        abi: Faucet_ABI,
        functionName: 'requestTokens',
        value: CLAIM_FEE,
        gas: 250000n, // Manually set a generous gas limit
        account: address!,
        chain: blockdagPrimordial,
      };

      await writeContractAsync(request);

    } catch (e) {
      console.error("Failed to send claim transaction:", e);
    }
  };

  const canClaim = cooldownRemaining <= 0;

  return {
    claimTokens,
    canClaim,
    cooldownRemaining,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
  };
}