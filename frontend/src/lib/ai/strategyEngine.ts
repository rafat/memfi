// src/lib/ai/strategyEngine.ts
import { WalletBalances } from '@/hooks/useUserWallet';
import { Tables } from '@/lib/supabase/database.types';
import { ethers } from 'ethers';

// Define simplified types for clarity
type LearnedPattern = Tables<'learned_patterns'>;
type StrategyStep = Omit<Tables<'strategy_steps'>, 'id' | 'strategy_id' | 'tx_hash'>;

// This will be the structured output from our NLP service
export interface NLPIntent {
  intent: 'generate_yield' | 'swap' | 'unknown';
  risk?: 'low' | 'moderate' | 'high';
  asset?: string;
  // ... other potential fields like amount, targetAsset, etc.
}

export class StrategyEngine {
  private intent: NLPIntent;
  private patterns: LearnedPattern | null;
  private balances: WalletBalances;

  constructor(intent: NLPIntent, patterns: LearnedPattern | null, balances: WalletBalances) {
    this.intent = intent;
    this.patterns = patterns;
    this.balances = balances;
  }

  public generateStrategy(): { title: string; steps: StrategyStep[] } | null {
    switch (this.intent.intent) {
      case 'generate_yield':
        return this.buildYieldStrategy();
      // TODO: Add cases for 'swap', 'rebalance_portfolio', etc.
      default:
        return null;
    }
  }

  private buildYieldStrategy(): { title: string; steps: StrategyStep[] } {
    const steps: StrategyStep[] = [];
    let title = 'Personalized Yield Strategy';

    // <<< NEW: Personalized logic based on user's actual holdings
    const mbtcBalance = this.balances.mbtc;
    const methBalance = this.balances.meth;
    const hasSignificantMbtc = mbtcBalance > ethers.parseUnits("0.1", 18); // e.g., > 0.1 MBTC

    if (hasSignificantMbtc) {
      title = `Low-Risk Staking on your ${ethers.formatEther(mbtcBalance)} MBTC`;
      // Suggest staking 50% of their MBTC balance
      const stakeAmount = mbtcBalance / 2n;
      
      steps.push({
        step_order: 1,
        protocol: 'staking',
        action: 'stake',
        token_in: 'MBTC',
        token_out: null,
        amount_in: stakeAmount.toString(), // Store as string
        amount_out: null,
      });
    } else if (methBalance > ethers.parseUnits("1", 18)) {
      title = 'Lend your METH to earn yield';
      const lendAmount = methBalance / 2n;
       steps.push({
        step_order: 1,
        protocol: 'lending',
        action: 'lend',
        token_in: 'METH',
        token_out: null,
        amount_in: lendAmount.toString(),
        amount_out: null,
      });
    } else {
        // Fallback if user has low balances
        title = 'Acquire Assets for Yield';
        return {title, steps: []} // Return empty steps
    }

    return { title, steps };
  }
}