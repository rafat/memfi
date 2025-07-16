// src/lib/ai/AIMemoryAgent.ts

import { supabase } from '@/lib/supabase/supabase';
import { ethers } from 'ethers';
import { BDAG_TESTNET } from '@/lib/contracts';
import { PatternAnalyzer } from './patternAnalyzer';
import { NLPIntent, StrategyEngine } from './strategyEngine';

// A placeholder for a real NLP service call
async function recognizeIntent(command: string): Promise<NLPIntent> {
  console.log(`[AI] Recognizing intent for: "${command}"`);
  const lower = command.toLowerCase();
  
  // In a real app, this would be an API call to OpenAI/Gemini
  // with a prompt that asks for a JSON output matching the NLPIntent interface.
  if (lower.includes('yield') || lower.includes('earn')) {
    const risk = lower.includes('low risk') ? 'low' : 'high';
    return { intent: 'generate_yield', risk };
  }
  if (lower.includes('swap')) {
    // TODO: Parse assets and amounts
    return { intent: 'swap', asset: 'METH' };
  }
  return { intent: 'unknown' };
}


export class AIMemoryAgent {
  private userAddress: string;

  constructor(userAddress: string) {
    // Always work with checksummed address
    this.userAddress = ethers.getAddress(userAddress);
  }

  // MVP Feature 1 & 7: Sync on-chain history
  public async syncAndAnalyze(): Promise<void> {
    console.log(`[Agent] Starting sync for ${this.userAddress}`);
    // In a real app, this would be a more complex process involving a dedicated indexer.
    // For the hackathon, we can simulate it or use a simplified log fetch.
    
    // For now, let's focus on analyzing existing data.
    await this.analyzePatterns();
  }

  // MVP Feature 2: Learn patterns
  private async analyzePatterns(): Promise<Tables<'learned_patterns'> | null> {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('action, token_in, token_out, amount_in')
      .eq('user_address', this.userAddress);

    if (error || !transactions) {
      console.error('[Agent] Error fetching transactions for analysis:', error);
      return null;
    }

    const analyzer = new PatternAnalyzer(transactions);
    const patterns = analyzer.analyze();

    const { data: updatedPattern, error: upsertError } = await supabase
      .from('learned_patterns')
      .upsert({
        user_address: this.userAddress,
        last_seen: new Date().toISOString(),
        ...patterns,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[Agent] Error saving learned patterns:', upsertError);
    } else {
      console.log('[Agent] Patterns updated successfully.');
    }
    return updatedPattern;
  }

  // MVP Feature 3, 4, 5: Handle NL command -> Recommend -> Preview
  public async handleCommand(command: string): Promise<any> {
    const intent = await recognizeIntent(command);
    if (intent.intent === 'unknown') {
      return { type: 'reply', message: "I'm not sure how to handle that. Try asking me to 'suggest a yield strategy'." };
    }

    const { data: patterns } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('user_address', this.userAddress)
      .single();

    const engine = new StrategyEngine(intent, patterns);
    const strategy = engine.generateStrategy();

    if (!strategy) {
      return { type: 'reply', message: "I understood your request but couldn't generate a specific strategy right now." };
    }
    
    // Save the draft strategy to the database
    const { data: newStrategy, error: strategyError } = await supabase
        .from('strategies')
        .insert({
            user_address: this.userAddress,
            title: strategy.title,
            intent: intent as any, // Cast since JSONB can be anything
            status: 'draft',
        })
        .select()
        .single();
    
    if (strategyError || !newStrategy) {
        return { type: 'reply', message: "I had an issue saving the new strategy."};
    }

    const stepsWithId = strategy.steps.map(step => ({...step, strategy_id: newStrategy.id}))
    await supabase.from('strategy_steps').insert(stepsWithId)
    
    // MVP Feature 5: Return a preview for the user to confirm
    return {
      type: 'strategy_preview',
      strategy: {
        id: newStrategy.id,
        ...strategy
      }
    };
  }

  // MVP Feature 8: Feedback Loop
  public async recordFeedback(strategyId: number, accepted: boolean): Promise<void> {
    await supabase.from('feedback').insert({
        strategy_id: strategyId,
        user_address: this.userAddress,
        accepted,
    })
    console.log(`[Agent] Feedback recorded for strategy ${strategyId}: ${accepted}`);
  }
}