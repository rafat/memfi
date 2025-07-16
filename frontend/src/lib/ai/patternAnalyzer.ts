// src/lib/ai/patternAnalyzer.ts

import { Tables } from '@/lib/supabase/database.types'; // Assuming you've generated types with `supabase gen types`

// Define a type for the input transactions to make the function clearer
type Transaction = Pick<
  Tables<'transactions'>,
  'action' | 'token_in' | 'token_out' | 'amount_in'
>;

export class PatternAnalyzer {
  private transactions: Transaction[];

  constructor(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  public analyze(): Omit<Tables<'learned_patterns'>, 'user_address' | 'last_seen'> {
    if (this.transactions.length === 0) {
      return {
        avg_trade_size: 0,
        top_pairs: [],
        risk_bucket: 'low',
      };
    }

    const avg_trade_size = this.calculateAverageTradeSize();
    const top_pairs = this.findTopTradingPairs();
    const risk_bucket = this.determineRiskBucket();

    return {
      avg_trade_size,
      top_pairs,
      risk_bucket,
    };
  }

  private calculateAverageTradeSize(): number {
    const swapTxns = this.transactions.filter(
      (t) => t.action === 'swap' && t.amount_in
    );
    if (swapTxns.length === 0) return 0;

    const totalVolume = swapTxns.reduce(
      (sum, t) => sum + Number(t.amount_in),
      0
    );
    return totalVolume / swapTxns.length;
  }

  private findTopTradingPairs(limit: number = 3): string[] {
    const pairCounts: { [key: string]: number } = {};
    this.transactions
      .filter((t) => t.action === 'swap' && t.token_in && t.token_out)
      .forEach((t) => {
        const pair = `${t.token_in}/${t.token_out}`;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      });

    return Object.entries(pairCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([pair]) => pair);
  }

  private determineRiskBucket(): 'low' | 'moderate' | 'high' {
    // Simple heuristic based on transaction count and complexity
    const txnCount = this.transactions.length;
    const hasLending = this.transactions.some(
      (t) => t.action === 'lend' || t.action === 'borrow'
    );

    if (txnCount > 20 || hasLending) {
      return 'high';
    }
    if (txnCount > 5) {
      return 'moderate';
    }
    return 'low';
  }
}