// src/lib/ai/strategyEngine.ts

import { Tables } from '@/lib/supabase/database.types';

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

  constructor(intent: NLPIntent, patterns: LearnedPattern | null) {
    this.intent = intent;
    this.patterns = patterns;
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
    // This is where the "AI" logic lives. We use patterns to personalize the strategy.
    // For this MVP, we'll use a simple rule-based system.

    const steps: StrategyStep[] = [];
    let title = 'Recommended Yield Strategy';

    // Simple personalization: if user is high-risk, suggest a more complex strategy.
    if (this.patterns?.risk_bucket === 'high') {
      title = 'Aggressive Yield on MBTC';
      steps.push({
        step_order: 1,
        protocol: 'lending',
        action: 'lend',
        token_in: 'MBTC', // Lend their most valuable asset
        token_out: null,
        amount_in: 1, // Example amount
        amount_out: null,
      });
      steps.push({
        step_order: 2,
        protocol: 'staking',
        action: 'stake',
        token_in: 'METH', // Stake their other asset
        token_out: null,
        amount_in: 5, // Example amount
        amount_out: null,
      });
    } else {
      // Default low-risk strategy: just stake their most valuable asset.
      title = 'Low-Risk Staking on MBTC';
      steps.push({
        step_order: 1,
        protocol: 'staking',
        action: 'stake',
        token_in: 'MBTC',
        token_out: null,
        amount_in: 10, // Suggest a larger, safer position
        amount_out: null,
      });
    }

    return { title, steps };
  }
}