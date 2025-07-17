// src/app/api/agent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';
import { DeFiStrategyEngine, ParsedStrategy } from '@/lib/ai/DeFiStrategyEngine';
import { createUserWalletFetcher } from '@/hooks/useUserWallet';
import { ethers } from 'ethers';
import { Address } from 'viem';
import { TablesInsert } from '@/lib/supabase/database.types';

// This function translates the AI's percentage-based plan into concrete numbers
const resolveStrategyAmounts = (strategy: ParsedStrategy, balances: any): (TablesInsert<'strategy_steps'>)[] => {
    return strategy.steps.map((step, index) => {
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
            amount_in: amountInBigInt.toString(), // Store as text
            amount_out: null, // This will be filled in after execution
        }
    })
}

export async function POST(req: NextRequest) {
  try {
    const { userAddress, command } = await req.json();

    if (!userAddress || !command) {
      return NextResponse.json({ error: 'userAddress and command are required' }, { status: 400 });
    }
    const checksummedAddress = ethers.getAddress(userAddress);

    // 1. Fetch all context for the AI
    const walletFetcher = createUserWalletFetcher();
    const [patternsRes, strategiesRes, balances] = await Promise.all([
      supabase.from('learned_patterns').select('*').eq('user_address', checksummedAddress).single(),
      supabase.from('strategies').select('*').eq('user_address', checksummedAddress).order('created_at', { ascending: false }).limit(5),
      walletFetcher.getBalances(checksummedAddress as Address)
    ]);
    
    // 2. Instantiate and run the AI engine
    const engine = new DeFiStrategyEngine();
    const aiStrategy = await engine.generateStrategy(
      command, 
      patternsRes.data, 
      balances,
      strategiesRes.data || []
    );

    // 3. Save the DRAFT strategy to the database
    const { data: newStrategy, error: strategyError } = await supabase
        .from('strategies')
        .insert({
            user_address: checksummedAddress,
            title: aiStrategy.title,
            intent: { command, reasoning: aiStrategy.reasoning } as any,
            status: 'draft',
        })
        .select()
        .single();
    
    if (strategyError || !newStrategy) {
        console.error("Error saving strategy:", strategyError);
        return NextResponse.json({ message: "I had an issue saving the new strategy." }, {status: 500});
    }

    // 4. Resolve percentages to actual amounts and save the steps
    const concreteSteps = resolveStrategyAmounts(aiStrategy, balances);
    const stepsWithId = concreteSteps.map(step => ({ ...step, strategy_id: newStrategy.id }));
    await supabase.from('strategy_steps').insert(stepsWithId);
    
    // 5. Return the full preview to the frontend for confirmation
    return NextResponse.json({
      type: 'strategy_preview',
      strategy: {
        id: newStrategy.id,
        title: aiStrategy.title,
        reasoning: aiStrategy.reasoning,
        steps: concreteSteps // Return steps with concrete amounts
      }
    });

  } catch (error) {
    console.error('[API Agent Error]', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}