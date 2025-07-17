// src/hooks/useStrategyExecution.ts

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { supabase } from '@/lib/supabase/supabase';
import { BDAG_TESTNET } from '@/lib/contracts';
import { AMM_ABI, LendingPool_ABI, Staking_ABI } from '@/lib/contracts/abis';
import { Address } from 'viem';
import { TablesInsert } from '@/lib/supabase/database.types';

// Define the shape of a strategy step for clarity
type Step = Omit<TablesInsert<'strategy_steps'>, 'id' | 'strategy_id' | 'tx_hash' | 'amount_out'> & {
    amount_in: string; // Ensure amount_in is a string (BigInt)
};

// Define the shape of the full strategy object this hook will accept
type Strategy = {
  id: number;
  title: string;
  steps: Step[];
};

// Define the possible states of the execution process
type ExecutionStatus = 'idle' | 'executing' | 'waiting_receipt' | 'completed' | 'failed';

export function useStrategyExecution() {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | undefined>();
  const [strategyToExecute, setStrategyToExecute] = useState<Strategy | null>(null);

  // 1. Get the async write function from wagmi
  const { writeContractAsync } = useWriteContract();

  // 2. Set up a hook to wait for the transaction receipt for the CURRENT txHash
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({ 
    hash: txHash,
  });

  // 3. A private function to execute a single step of the strategy
  const executeStep = useCallback(async (stepNumber: number, strategy: Strategy) => {
    setCurrentStep(stepNumber);
    setStatus('executing');
    
    const stepIndex = stepNumber - 1;
    const step = strategy.steps[stepIndex];

    try {
      let hash: Address | undefined;
      const amount = BigInt(step.amount_in);
      const tokenInAddress = BDAG_TESTNET.tokens[step.token_in as keyof typeof BDAG_TESTNET.tokens] as Address;

      // Use the generic writeContractAsync for each action
      switch (`${step.protocol}:${step.action}`) {
        case 'amm:swap':
          const tokenOutAddress = BDAG_TESTNET.tokens[step.token_out as keyof typeof BDAG_TESTNET.tokens] as Address;
          hash = await writeContractAsync({
              address: BDAG_TESTNET.contracts.AMM as Address,
              abi: AMM_ABI,
              functionName: 'swap',
              args: [tokenInAddress, amount],
          });
          break;
        case 'lending:lend':
          // Assuming 'lend' action maps to 'depositCollateral'
          hash = await writeContractAsync({
              address: BDAG_TESTNET.contracts.LendingPool as Address,
              abi: LendingPool_ABI,
              functionName: 'depositCollateral',
              args: [amount],
          });
          break;
        case 'staking:stake':
          hash = await writeContractAsync({
              address: BDAG_TESTNET.contracts.Staking as Address,
              abi: Staking_ABI,
              functionName: 'stake',
              args: [amount],
          });
          break;
        default:
          throw new Error(`Unknown or unsupported action: ${step.protocol}:${step.action}`);
      }
      
      console.log(`Step ${stepNumber} transaction sent. Hash: ${hash}`);
      setTxHash(hash);
      setStatus('waiting_receipt');

    } catch (err: any) {
      console.error(`Error sending transaction for step ${stepNumber}:`, err);
      setError(err.shortMessage || err.message || "An unknown error occurred.");
      setStatus('failed');
      // Update strategy status in DB to 'failed'
      if (strategy) {
        await supabase.from('strategies').update({ status: 'failed' }).eq('id', strategy.id);
      }
      setStrategyToExecute(null); // Stop further execution
    }
  }, [writeContractAsync]);

  // 4. A useEffect to react to the transaction confirmation status
  useEffect(() => {
    // Only proceed if we are in the 'waiting_receipt' state and have a strategy to execute
    if (status !== 'waiting_receipt' || !strategyToExecute) return;

    if (isConfirmed && receipt) {
      console.log(`Step ${currentStep} confirmed successfully!`);

      // Update the step in Supabase with the transaction hash
      supabase.from('strategy_steps').update({ tx_hash: receipt.transactionHash }).match({ strategy_id: strategyToExecute.id, step_order: currentStep });

      // Check if there are more steps left in the strategy
      if (currentStep < strategyToExecute.steps.length) {
        // Automatically execute the next step
        const nextStep = currentStep + 1;
        console.log(`Proceeding to step ${nextStep}...`);
        executeStep(nextStep, strategyToExecute);
      } else {
        // This was the last step, the strategy is complete
        console.log("Strategy execution completed successfully!");
        setStatus('completed');
        supabase.from('strategies').update({ status: 'completed', executed_at: new Date().toISOString() }).eq('id', strategyToExecute.id);
        setStrategyToExecute(null); // Clear the active strategy
      }
    }

    if (isTxError) {
      console.error(`Transaction for step ${currentStep} failed to confirm or reverted.`);
      setError(`Transaction for step ${currentStep} failed.`);
      setStatus('failed');
      supabase.from('strategies').update({ status: 'failed' }).eq('id', strategyToExecute.id);
      setStrategyToExecute(null); // Stop further execution
    }
  }, [isConfirmed, isTxError, receipt, currentStep, strategyToExecute, executeStep]);

  // 5. The main public function that the UI will call to start the whole process
  const executeStrategy = useCallback(async (strategy: Strategy) => {
    if (status !== 'idle' && status !== 'completed' && status !== 'failed') {
        console.warn("Execution already in progress.");
        return;
    }
    
    console.log(`Starting execution for strategy: "${strategy.title}" (ID: ${strategy.id})`);
    setError(null);
    setStrategyToExecute(strategy); // Set the strategy we are currently working on
    
    // Mark the strategy as 'submitted' in the database
    await supabase.from('strategies').update({ status: 'submitted' }).eq('id', strategy.id);
    
    // Kick off the process by executing the first step
    executeStep(1, strategy);

  }, [status, executeStep]);

  // The public interface of the hook
  return {
    executeStrategy,
    status,         // 'idle', 'executing', 'waiting_receipt', 'completed', 'failed'
    currentStep,    // Which step number is currently active (1-based)
    error,          // Any error messages
    isConfirming,   // Boolean for showing a "Waiting for confirmation..." spinner
    txHash,         // The hash of the latest transaction sent
  };
}