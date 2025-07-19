// src/hooks/useStrategyExecution.ts

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { BDAG_TESTNET } from '@/lib/contracts';
import { AMM_ABI, LendingPool_ABI, Staking_ABI } from '@/lib/contracts/abis';
import { Address, erc20Abi, maxUint256 } from 'viem';
import { createUserWalletFetcher } from './useUserWallet';
import { getErrorMessage } from '@/lib/utils';
import { parseGwei } from 'viem';

// --- Type Definitions ---
export type AIStrategy = {
  title: string;
  reasoning: string;
  steps: {
    protocol: string;
    action: string;
    token_in: string;
    amount_in_percent: number;
    token_out?: string;
  }[];
};

type ConcreteStrategy = {
  id: number;
  title: string;
  steps: {
    step_order: number;
    protocol: string;
    action: string;
    token_in: string;
    amount_in: string;
    token_out: string | null;
  }[];
};

type ExecutionStatus = 'idle' | 'creating' | 'approving' | 'executing' | 'waiting_receipt' | 'completed' | 'failed';

const resolveStrategyAmounts = async (aiStrategy: AIStrategy, userAddress: Address) => {
    const balances = await createUserWalletFetcher().getBalances(userAddress);
    return aiStrategy.steps.map((step, index) => {
        let amountInBigInt = 0n;
        const tokenInBalance = step.token_in === 'METH' ? balances.meth : balances.mbtc;
        if (tokenInBalance > 0n) {
            amountInBigInt = (tokenInBalance * BigInt(step.amount_in_percent)) / 100n;
        }
        return {
            step_order: index + 1,
            protocol: step.protocol,
            action: step.action,
            token_in: step.token_in,
            token_out: step.token_out || null,
            amount_in: amountInBigInt.toString(),
        };
    });
};

// Helper function for better error handling
const getDetailedError = async (publicClient: any, txConfig: any) => {
  try {
    // Try to simulate the transaction to get a better error message
    await publicClient.simulateContract(txConfig);
  } catch (simulateError: any) {
    console.error('🔍 Contract simulation failed:', simulateError);
    if (simulateError.cause?.reason) {
      return simulateError.cause.reason;
    }
    if (simulateError.shortMessage) {
      return simulateError.shortMessage;
    }
    return simulateError.message || 'Unknown contract error';
  }
};

// Helper function to handle contract-specific errors
const handleContractError = (error: any, action: string) => {
  if (error.message?.includes('Internal JSON-RPC error')) {
    return `${action} failed: Contract execution error. Please check: 1) Token balance, 2) Contract state, 3) Network stability`;
  }
  if (error.message?.includes('execution reverted')) {
    return `${action} was reverted by the contract. Check contract conditions.`;
  }
  if (error.message?.includes('insufficient funds')) {
    return `Insufficient funds for ${action}`;
  }
  if (error.message?.includes('Contract simulation failed')) {
    return error.message;
  }
  return `${action} failed: ${getErrorMessage(error)}`;
};

export function useStrategyExecution() {
  const { address } = useAccount();
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | undefined>();
  const [strategyToExecute, setStrategyToExecute] = useState<ConcreteStrategy | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  // --- HOOKS CALLED AT TOP LEVEL (Correct) ---
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: BDAG_TESTNET.chainId });
  const { data: receipt, isSuccess: isConfirmed, isError: isTxError, isLoading: isReceiptLoading } = useWaitForTransactionReceipt({ 
    hash: txHash,
    pollingInterval: 3_000, // Increase polling interval to 3 seconds for better reliability
    timeout: 180_000, // 3 minutes timeout
  });

  // Debug effect to log transaction state
  useEffect(() => {
    if (txHash) {
      console.log('🔍 DEBUG - Transaction state:', {
        txHash,
        status,
        pendingApproval,
        isConfirmed,
        isTxError,
        isReceiptLoading,
        receipt: receipt ? {
          transactionHash: receipt.transactionHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber
        } : null
      });
    }
  }, [txHash, status, pendingApproval, isConfirmed, isTxError, isReceiptLoading, receipt]);

  // Verify balances and allowances before execution
  const verifyBalancesAndAllowances = useCallback(async (strategy: ConcreteStrategy) => {
    if (!publicClient || !address) return;
    
    console.log('🔍 Verifying balances and allowances...');
    
    for (const step of strategy.steps) {
      const tokenAddress = BDAG_TESTNET.tokens[step.token_in as keyof typeof BDAG_TESTNET.tokens] as Address;
      const protocolKey = step.protocol === 'amm' ? 'AMM' : step.protocol === 'lending' ? 'LendingPool' : 'Staking';
      const protocolAddress = BDAG_TESTNET.contracts[protocolKey] as Address;
      
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address]
      });
      
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, protocolAddress]
      });
      
      console.log(`Token: ${step.token_in}, Balance: ${balance}, Required: ${step.amount_in}, Allowance: ${allowance}`);
    }
  }, [publicClient, address]);

  // Check allowance and initiate approval if needed
  const checkAllowanceAndApprove = useCallback(async (stepNumber: number, strategy: ConcreteStrategy) => {
    const step = strategy.steps[stepNumber - 1];
    const amount = BigInt(step.amount_in);
    const tokenInAddress = BDAG_TESTNET.tokens[step.token_in as keyof typeof BDAG_TESTNET.tokens] as Address;
    const protocolKey = step.protocol === 'amm' ? 'AMM' : step.protocol === 'lending' ? 'LendingPool' : 'Staking';
    const protocolContractAddress = BDAG_TESTNET.contracts[protocolKey] as Address;

    if (!publicClient) throw new Error("Public client not available");

    console.log(`🔍 Checking allowance for step ${stepNumber}...`);
    const gasPrice = parseGwei('10');
    
    const allowance = await publicClient.readContract({
        address: tokenInAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address!, protocolContractAddress]
    });

    console.log(`💰 Current allowance: ${allowance}, Required: ${amount}`);

    if (allowance < amount) {
        console.log(`❌ Allowance is insufficient. Requesting approval...`);
        setStatus('approving');
        setPendingApproval(true);
        
        try {
          // First simulate the approval
          await publicClient.simulateContract({
            address: tokenInAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [protocolContractAddress, maxUint256],
            account: address,
          });

          // If simulation passes, execute the approval
          const approvalHash = await writeContractAsync({
            address: tokenInAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [protocolContractAddress, maxUint256],
            gas: 60000n,
            gasPrice: gasPrice,
            maxFeePerGas: undefined,
            maxPriorityFeePerGas: undefined,
            chainId: BDAG_TESTNET.chainId,
          });
          
          console.log(`📝 Approval transaction sent: ${approvalHash}`);
          setTxHash(approvalHash);
          setStatus('waiting_receipt');
          // Don't wait here - let the useEffect handle the receipt
          return;
        } catch (err: any) {
          console.error('❌ Approval failed:', err);
          throw new Error(handleContractError(err, 'Token approval'));
        }
    }

    // If allowance is sufficient, proceed directly to execution
    console.log(`✅ Allowance is sufficient, proceeding to execute action`);
    await executeStepAction(stepNumber, strategy);
  }, [address, publicClient, writeContractAsync]);

  // Execute the actual step action (swap, lend, stake)
  const executeStepAction = useCallback(async (stepNumber: number, strategy: ConcreteStrategy) => {
    const step = strategy.steps[stepNumber - 1];
    const amount = BigInt(step.amount_in);
    const tokenInAddress = BDAG_TESTNET.tokens[step.token_in as keyof typeof BDAG_TESTNET.tokens] as Address;
    const gasPrice = parseGwei('10');

    setStatus('executing');
    console.log(`🚀 Executing main action for step ${stepNumber}...`);
    
    // Add balance check before execution
    if (!publicClient) throw new Error("Public client not available");
    
    const userBalance = await publicClient.readContract({
      address: tokenInAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address!]
    });
    
    console.log(`💰 User balance: ${userBalance}, Required: ${amount}`);
    
    if (userBalance < amount) {
      throw new Error(`Insufficient balance. Have: ${userBalance}, Need: ${amount}`);
    }
    
    let actionHash: Address | undefined;
    const baseTransactionConfig = { 
      gas: 300000n, 
      gasPrice: gasPrice, 
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined, 
      chainId: BDAG_TESTNET.chainId, 
    };

    try {
      switch (`${step.protocol}:${step.action}`) {
        case 'amm:swap':
          console.log('🔍 Simulating swap transaction...');
          
          // Simulate first
          await publicClient.simulateContract({
            address: BDAG_TESTNET.contracts.AMM as Address,
            abi: AMM_ABI, 
            functionName: 'swap', 
            args: [tokenInAddress, amount],
            account: address,
          });
          
          console.log('✅ Swap simulation successful, executing...');
          
          // Execute if simulation passes
          actionHash = await writeContractAsync({
            address: BDAG_TESTNET.contracts.AMM as Address,
            abi: AMM_ABI, 
            functionName: 'swap', 
            args: [tokenInAddress, amount],
            ...baseTransactionConfig 
          });
          break;
          
        case 'lending:lend':
          console.log('🔍 Simulating lending transaction...');
          console.log('📋 Lending config:', {
            address: BDAG_TESTNET.contracts.LendingPool,
            functionName: 'depositCollateral',
            args: [amount],
            account: address
          });
          
          try {
            // Simulate first
            await publicClient.simulateContract({
              address: BDAG_TESTNET.contracts.LendingPool as Address,
              abi: LendingPool_ABI, 
              functionName: 'depositCollateral', 
              args: [amount],
              account: address,
            });
            console.log('✅ Lending simulation successful, executing...');
          } catch (simError: any) {
            console.error('❌ Lending simulation failed:', simError);
            const detailedError = await getDetailedError(publicClient, {
              address: BDAG_TESTNET.contracts.LendingPool as Address,
              abi: LendingPool_ABI, 
              functionName: 'depositCollateral', 
              args: [amount],
              account: address,
            });
            throw new Error(`Contract simulation failed: ${detailedError}`);
          }
          
          // Execute if simulation passes
          actionHash = await writeContractAsync({
            address: BDAG_TESTNET.contracts.LendingPool as Address,
            abi: LendingPool_ABI, 
            functionName: 'depositCollateral', 
            args: [amount],
            ...baseTransactionConfig 
          });
          break;
          
        case 'staking:stake':
          console.log('🔍 Simulating staking transaction...');
          
          // Simulate first
          await publicClient.simulateContract({
            address: BDAG_TESTNET.contracts.Staking as Address,
            abi: Staking_ABI, 
            functionName: 'stake', 
            args: [amount],
            account: address,
          });
          
          console.log('✅ Staking simulation successful, executing...');
          
          // Execute if simulation passes
          actionHash = await writeContractAsync({
            address: BDAG_TESTNET.contracts.Staking as Address,
            abi: Staking_ABI, 
            functionName: 'stake', 
            args: [amount],
            ...baseTransactionConfig 
          });
          break;
          
        default: 
          throw new Error(`Unsupported action: ${step.protocol}:${step.action}`);
      }
      
      console.log(`📝 Step ${stepNumber} action transaction sent: ${actionHash}`);
      setTxHash(actionHash);
      setStatus('waiting_receipt');
      setPendingApproval(false);
      
    } catch (err: any) {
      console.error(`❌ Error executing step action:`, err);
      throw new Error(handleContractError(err, `Step ${stepNumber} ${step.action}`));
    }
  }, [writeContractAsync, publicClient, address]);

  // Start executing a step
  const executeStep = useCallback(async (stepNumber: number, strategy: ConcreteStrategy) => {
    setCurrentStep(stepNumber);
    console.log(`🎯 Starting execution of step ${stepNumber}`);
    
    try {
      await checkAllowanceAndApprove(stepNumber, strategy);
    } catch (err: any) {
      console.error(`❌ Error executing step ${stepNumber}:`, err);
            setError(handleContractError(err, `Step ${stepNumber}`));
      setStatus('failed');
      await fetch(`/api/strategies/${strategy.id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ 
          type: 'UPDATE_STRATEGY_STATUS', 
          payload: { status: 'failed' } 
        }) 
      });
      setStrategyToExecute(null);
      setPendingApproval(false);
    }
  }, [checkAllowanceAndApprove]);

  // Handle transaction confirmations
  useEffect(() => {
    if (status !== 'waiting_receipt' || !strategyToExecute || !txHash) return;

    console.log(`🔄 useEffect triggered - status: ${status}, txHash: ${txHash}, pendingApproval: ${pendingApproval}`);

    const handleConfirmation = async () => {
        if (isConfirmed && receipt) {
            console.log(`✅ Transaction confirmed! Receipt:`, receipt);
            
            if (pendingApproval) {
                // Approval was confirmed, now execute the actual action
                console.log(`🎉 Step ${currentStep} approval confirmed, executing action...`);
                setPendingApproval(false);
                try {
                  await executeStepAction(currentStep, strategyToExecute);
                } catch (err: any) {
                  console.error(`❌ Error executing action after approval:`, err);
                  setError(handleContractError(err, `Step ${currentStep} action after approval`));
                  setStatus('failed');
                  await fetch(`/api/strategies/${strategyToExecute.id}`, { 
                    method: 'PATCH', 
                    body: JSON.stringify({ 
                      type: 'UPDATE_STRATEGY_STATUS', 
                      payload: { status: 'failed' } 
                    }) 
                  });
                  setStrategyToExecute(null);
                }
            } else {
                // Action was confirmed, move to next step or complete
                console.log(`🎉 Step ${currentStep} action confirmed successfully!`);
                await fetch(`/api/strategies/${strategyToExecute.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        type: 'UPDATE_STEP_TX',
                        payload: { step_order: currentStep, tx_hash: receipt.transactionHash }
                    })
                });

                if (currentStep < strategyToExecute.steps.length) {
                    console.log(`➡️ Moving to step ${currentStep + 1}`);
                    executeStep(currentStep + 1, strategyToExecute);
                } else {
                    console.log("🏆 Strategy completed!");
                    setStatus('completed');
                    await fetch(`/api/strategies/${strategyToExecute.id}`, { 
                      method: 'PATCH', 
                      body: JSON.stringify({ 
                        type: 'UPDATE_STRATEGY_STATUS', 
                        payload: { status: 'completed' } 
                      }) 
                    });
                    setStrategyToExecute(null);
                }
            }
        } else if (isTxError) {
            const txType = pendingApproval ? 'approval' : 'action';
            console.error(`❌ ${txType} tx for step ${currentStep} failed.`);
            setError(`${txType} transaction for step ${currentStep} reverted or failed.`);
            setStatus('failed');
            setPendingApproval(false);
            await fetch(`/api/strategies/${strategyToExecute.id}`, { 
              method: 'PATCH', 
              body: JSON.stringify({ 
                type: 'UPDATE_STRATEGY_STATUS', 
                payload: { status: 'failed' } 
              }) 
            });
            setStrategyToExecute(null);
        } else if (isReceiptLoading) {
            console.log(`⏳ Still waiting for transaction receipt...`);
        }
    };
    
    handleConfirmation();
  }, [isConfirmed, isTxError, receipt, currentStep, strategyToExecute, executeStep, executeStepAction, pendingApproval, txHash, status, isReceiptLoading]);

  // The main public function called by the UI
  const executeStrategy = useCallback(async (aiStrategy: AIStrategy) => {
    if (!address) {
        setError("Please connect your wallet to execute a strategy.");
        return;
    }
    if (status !== 'idle' && status !== 'completed' && status !== 'failed') return;
    
    console.log(`🚀 Starting strategy execution: ${aiStrategy.title}`);
    setStatus('creating');
    setError(null);
    setPendingApproval(false);

    try {
        const concreteSteps = await resolveStrategyAmounts(aiStrategy, address);
        
        // Validate that we have positive amounts
        const invalidSteps = concreteSteps.filter(step => BigInt(step.amount_in) <= 0n);
        if (invalidSteps.length > 0) {
          throw new Error(`Invalid amounts detected for tokens: ${invalidSteps.map(s => s.token_in).join(', ')}. Please check your token balances.`);
        }
        
        const createResponse = await fetch('/api/strategies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: address,
                strategy: {
                    title: aiStrategy.title,
                    reasoning: aiStrategy.reasoning,
                    steps: concreteSteps,
                },
            }),
        });

        if (!createResponse.ok) {
            const err = await createResponse.json();
            throw new Error(err.error || "Failed to create strategy in database.");
        }
        const { strategyId } = await createResponse.json();
        
        const concreteStrategy: ConcreteStrategy = {
            id: strategyId,
            title: aiStrategy.title,
            steps: concreteSteps,
        };

        console.log(`📋 Strategy created with ID: ${strategyId}`);
        setStrategyToExecute(concreteStrategy);
        
        // Verify balances and allowances before starting execution
        await verifyBalancesAndAllowances(concreteStrategy);
        
        executeStep(1, concreteStrategy);

    } catch (err: any) {
        console.error(`❌ Error in executeStrategy:`, err);
        setError(handleContractError(err, 'Strategy execution'));
        setStatus('failed');
    }
  }, [address, status, executeStep, verifyBalancesAndAllowances]);

  // A single, comprehensive loading flag for the UI
  const isExecuting = status === 'creating' || status === 'approving' || status === 'executing' || status === 'waiting_receipt';

  // The public interface of the hook
  return {
    executeStrategy,
    status,
    currentStep,
    error,
    isExecuting,
    txHash,
  };
}

