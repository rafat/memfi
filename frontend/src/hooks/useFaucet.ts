// src/hooks/useFaucet.ts
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { BDAG_TESTNET } from '@/lib/contracts';
import { Faucet_ABI } from '@/lib/contracts/abis'; // You will need to add this ABI
import { Address } from 'viem';

const FAUCET_ADDRESS = BDAG_TESTNET.contracts.Faucet as Address;
const CLAIM_FEE = parseEther("0.1");

export function useFaucet() {
  const { address } = useAccount();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Hook for writing to the contract (claiming tokens)
  const { data: hash, isPending, error, writeContractAsync } = useWriteContract();

  // Hook for reading the user's next available claim time
  const { data: nextClaimTime, refetch: refetchClaimTime } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: Faucet_ABI,
    functionName: 'nextClaimTime',
    args: [address!],
    query: {
      enabled: !!address, // Only run this query if the user is connected
    }
  });

  // Hook to wait for the transaction to be confirmed
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  // Effect to manage the countdown timer
  useEffect(() => {
    if (nextClaimTime) {
      const interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Number(nextClaimTime) - now;
        setCooldownRemaining(remaining > 0 ? remaining : 0);
      }, 1000);
      
      return () => clearInterval(interval); // Cleanup interval on component unmount
    }
  }, [nextClaimTime]);
  
  // Effect to refetch the claim time after a successful claim
  useEffect(() => {
    if (isConfirmed) {
      refetchClaimTime();
    }
  }, [isConfirmed, refetchClaimTime]);

  // Main function to be called by the UI button
  const claimTokens = async () => {
    try {
      await writeContractAsync({
        address: FAUCET_ADDRESS,
        abi: Faucet_ABI,
        functionName: 'requestTokens',
        value: CLAIM_FEE, // Send 0.1 BDAG with the transaction
      });
    } catch (e) {
      console.error("Failed to send claim transaction:", e);
      // The `error` state from the hook will be automatically populated.
    }
  };

  const canClaim = cooldownRemaining <= 0;

  return {
    claimTokens,
    canClaim,
    cooldownRemaining, // in seconds
    isPending,        // Is the "Confirm" in wallet popup open?
    isConfirming,     // Is the transaction mining?
    isConfirmed,      // Was the transaction successful?
    error,            // Any error that occurred
    hash,             // The transaction hash
  };
}
