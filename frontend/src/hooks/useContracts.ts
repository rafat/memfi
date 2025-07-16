// src/hooks/useContracts.ts
import { 
  useReadContract, 
  useWriteContract, 
  usePublicClient,
  UseReadContractReturnType,
  UseWriteContractReturnType
} from 'wagmi';
import { BDAG_TESTNET } from '@/lib/contracts';
import { 
  AMM_ABI, 
  LendingPool_ABI, 
  MultiTokenPriceOracle_ABI, 
  PortfolioTracker_ABI, 
  Staking_ABI 
} from '@/lib/contracts/abis';
import { Address } from 'viem';

const CONTRACTS = BDAG_TESTNET.contracts;
const CHAIN_ID = BDAG_TESTNET.chainId;

// Type definitions for portfolio data
export type AMMPosition = {
  ammPair: Address;
  lpBalance: bigint;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
};

export type LendingPosition = {
  lendingPool: Address;
  collateralToken: Address;
  collateralAmount: bigint;
  borrowToken: Address;
  borrowedAmount: bigint;
};

export type StakingPosition = {
  stakingPool: Address;
  stakingToken: Address;
  stakedAmount: bigint;
  rewardToken: Address;
  pendingRewards: bigint;
};

export type FullPortfolio = {
  ammPositions: AMMPosition[];
  lendingPositions: LendingPosition[];
  stakingPositions: StakingPosition[];
};

// ====================== AMM Hook ======================
export function useAMM() {
  const { writeContract, ...writeRest } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const addLiquidity = async (amount0: bigint, amount1: bigint) => {
    return writeContract({
      address: CONTRACTS.AMM as Address,
      abi: AMM_ABI,
      functionName: 'addLiquidity',
      args: [amount0, amount1],
      chainId: CHAIN_ID,
    });
  };

  const removeLiquidity = async (liquidity: bigint) => {
    return writeContract({
      address: CONTRACTS.AMM as Address,
      abi: AMM_ABI,
      functionName: 'removeLiquidity',
      args: [liquidity],
      chainId: CHAIN_ID,
    });
  };

  const swap = async (tokenIn: Address, amountIn: bigint) => {
    return writeContract({
      address: CONTRACTS.AMM as Address,
      abi: AMM_ABI,
      functionName: 'swap',
      args: [tokenIn, amountIn],
      chainId: CHAIN_ID,
    });
  };

  return {
    addLiquidity,
    removeLiquidity,
    swap,
  };
}

// ====================== Lending Pool Hook ======================
export function useLendingPool() {
  const { writeContract, ...writeRest } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const depositCollateral = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'depositCollateral',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const withdrawCollateral = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'withdrawCollateral',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const borrow = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'borrow',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const repay = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'repay',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const liquidate = async (user: Address, repayAmount: bigint) => {
    return writeContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'liquidate',
      args: [user, repayAmount],
      chainId: CHAIN_ID,
    });
  };

  const getBorrowBalance = async (user: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.LendingPool as Address,
      abi: LendingPool_ABI,
      functionName: 'getBorrowBalance',
      args: [user],
    }) as Promise<bigint>;
  };

  return {
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    liquidate,
    getBorrowBalance,
  };
}

// ====================== Staking Hook ======================
export function useStaking() {
  const { writeContract, ...writeRest } = useWriteContract();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const stake = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.Staking as Address,
      abi: Staking_ABI,
      functionName: 'stake',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const unstake = async (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.Staking as Address,
      abi: Staking_ABI,
      functionName: 'unstake',
      args: [amount],
      chainId: CHAIN_ID,
    });
  };

  const claimReward = async () => {
    return writeContract({
      address: CONTRACTS.Staking as Address,
      abi: Staking_ABI,
      functionName: 'claimReward',
      chainId: CHAIN_ID,
    });
  };

  const getEarnedRewards = async (user: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.Staking as Address,
      abi: Staking_ABI,
      functionName: 'earned',
      args: [user],
    }) as Promise<bigint>;
  };

  return {
    stake,
    unstake,
    claimReward,
    getEarnedRewards,
  };
}

// ====================== Price Oracle Hook ======================
export function usePriceOracle() {
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const getPrice = async (token: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.MultiTokenPriceOracle as Address,
      abi: MultiTokenPriceOracle_ABI,
      functionName: 'getPrice',
      args: [token],
    }) as Promise<bigint>;
  };

  return {
    getPrice
  };
}

// ====================== Portfolio Tracker Hook ======================
export function usePortfolioTracker() {
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const getFullPortfolio = async (
    user: Address,
    ammPairs: Address[],
    lendingPools: Address[],
    stakingPools: Address[]
  ) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.PortfolioTracker as Address,
      abi: PortfolioTracker_ABI,
      functionName: 'getFullPortfolio',
      args: [user, ammPairs, lendingPools, stakingPools],
    }) as Promise<FullPortfolio>;
  };

  const getAMMPosition = async (user: Address, ammPair: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.PortfolioTracker as Address,
      abi: PortfolioTracker_ABI,
      functionName: 'getAMMPosition',
      args: [user, ammPair],
    }) as Promise<AMMPosition>;
  };

  const getLendingPosition = async (user: Address, lendingPool: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.PortfolioTracker as Address,
      abi: PortfolioTracker_ABI,
      functionName: 'getLendingPosition',
      args: [user, lendingPool],
    }) as Promise<LendingPosition>;
  };

  const getStakingPosition = async (user: Address, stakingPool: Address) => {
    if (!publicClient) throw new Error("Public client not available");
    return publicClient.readContract({
      address: CONTRACTS.PortfolioTracker as Address,
      abi: PortfolioTracker_ABI,
      functionName: 'getStakingPosition',
      args: [user, stakingPool],
    }) as Promise<StakingPosition>;
  };

  return {
    getFullPortfolio,
    getAMMPosition,
    getLendingPosition,
    getStakingPosition
  };
}
/*
// ====================== Individual Position Hooks ======================
export function useAMMPosition(user: Address | undefined, ammPair: Address | undefined) {
  return useReadContract({
    address: CONTRACTS.PortfolioTracker as Address,
    abi: PortfolioTracker_ABI,
    functionName: 'getAMMPosition',
    args: user && ammPair ? [user, ammPair] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!user && !!ammPair,
    }
  }) as UseReadContractReturnType<AMMPosition>;
}

export function useLendingPosition(user: Address | undefined, lendingPool: Address | undefined) {
  return useReadContract({
    address: CONTRACTS.PortfolioTracker as Address,
    abi: PortfolioTracker_ABI,
    functionName: 'getLendingPosition',
    args: user && lendingPool ? [user, lendingPool] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!user && !!lendingPool,
    }
  }) as UseReadContractReturnType<LendingPosition>;
}

export function useStakingPosition(user: Address | undefined, stakingPool: Address | undefined) {
  return useReadContract({
    address: CONTRACTS.PortfolioTracker as Address,
    abi: PortfolioTracker_ABI,
    functionName: 'getStakingPosition',
    args: user && stakingPool ? [user, stakingPool] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!user && !!stakingPool,
    }
  }) as UseReadContractReturnType<StakingPosition>;
}
  */