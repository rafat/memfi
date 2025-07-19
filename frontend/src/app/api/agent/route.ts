// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/supabase-server'; // Using public client is fine for reads
import { DeFiStrategyEngine } from '@/lib/ai/DeFiStrategyEngine';
import { createUserWalletFetcher } from '@/hooks/useUserWallet';
import { ethers } from 'ethers';
import { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { blockdagPrimordial } from '@/chains';
import { BDAG_TESTNET } from '@/lib/contracts';
import { LendingPool_ABI, Staking_ABI, MultiTokenPriceOracle_ABI } from '@/lib/contracts/abis';

// No database writes happen here anymore. This is a pure "read and process" route.
export async function POST(req: NextRequest) {
  try {
    const { userAddress, command } = await req.json();

    if (!userAddress || !command) {
      return NextResponse.json({ error: 'userAddress and command are required' }, { status: 400 });
    }
    const checksummedAddress = ethers.getAddress(userAddress);
    const walletFetcher = createUserWalletFetcher();
    
    // Create a server-side viem client to read from the oracle
    const publicClient = createPublicClient({ chain: blockdagPrimordial, transport: http() });

    // 1. Fetch all context for the AI
    const [
      patternsRes, 
      strategiesRes, 
      balances, 
      methPrice, 
      mbtcPrice,
      stakingRewardRate,
      lendingCollateralRatio,
      lendingLiquidationThreshold] = await Promise.all([
      supabaseServer.from('learned_patterns').select('*').eq('user_address', checksummedAddress).single(),
      supabaseServer.from('strategies').select('*').eq('user_address', checksummedAddress).order('created_at', { ascending: false }).limit(5),
      walletFetcher.getBalances(checksummedAddress as Address),
      // Fetch the latest price of METH from our on-chain oracle
      publicClient.readContract({
        address: BDAG_TESTNET.contracts.MultiTokenPriceOracle as Address,
        abi: MultiTokenPriceOracle_ABI,
        functionName: 'getPrice',
        args: [BDAG_TESTNET.tokens.METH as Address],
      }) as Promise<bigint>,
      // Fetch the latest price of MBTC
      publicClient.readContract({
        address: BDAG_TESTNET.contracts.MultiTokenPriceOracle as Address,
        abi: MultiTokenPriceOracle_ABI,
        functionName: 'getPrice',
        args: [BDAG_TESTNET.tokens.MBTC as Address],
      }) as Promise<bigint>,
      // <<< NEW: Fetch Staking Reward Rate >>>
      publicClient.readContract({
        address: BDAG_TESTNET.contracts.Staking as Address,
        abi: Staking_ABI,
        functionName: 'rewardRate',
      }) as Promise<bigint>,
      // <<< NEW: Fetch Lending Collateral Ratio >>>
      publicClient.readContract({
        address: BDAG_TESTNET.contracts.LendingPool as Address,
        abi: LendingPool_ABI,
        functionName: 'collateralizationRatio',
      }) as Promise<bigint>,
      // <<< NEW: Fetch Lending Liquidation Threshold >>>
      publicClient.readContract({
        address: BDAG_TESTNET.contracts.LendingPool as Address,
        abi: LendingPool_ABI,
        functionName: 'liquidationThreshold',
      }) as Promise<bigint>,
    ]);
    
    // 2. Instantiate and run the AI engine
    const engine = new DeFiStrategyEngine();
    const aiStrategy = await engine.generateStrategy(
      command, 
      patternsRes.data, 
      balances,
      strategiesRes.data || [],
      { METH: methPrice, MBTC: mbtcPrice },
      {
        stakingRewardRate,
        collateralRatio: lendingCollateralRatio,
        liquidationThreshold: lendingLiquidationThreshold
      }
    );
    
    // 3. Return the preview directly to the frontend
    return NextResponse.json({
      type: 'strategy_preview',
      strategy: aiStrategy
    });

  } catch (error) {
    console.error('[API Agent Error]', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}