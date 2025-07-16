import { supabase } from '@/lib/supabase/supabase';
import { ethers } from 'ethers';
import { BDAG_TESTNET } from '@/lib/contracts';

export class AIMemoryAgent {
  private userAddress: string;

  constructor(userAddress: string) {
    this.userAddress = ethers.getAddress(userAddress);
  }

  /* ---------- 1.  Sync on-chain history ---------- */
  async syncTransactions() {
    const provider = new ethers.JsonRpcProvider(BDAG_TESTNET.rpc);
    const logs = await provider.getLogs({
      address: null,
      fromBlock: 0,
      toBlock: 'latest',
      topics: [null, ethers.zeroPadValue(this.userAddress, 32)],
    });

    const rows = logs.map((l) => ({
      user_address: this.userAddress,
      tx_hash: l.transactionHash,
      block_time: new Date().toISOString(), // lazy timestamp
      action: 'unknown',                    // parse from ABI later
    }));

    await supabase.from('transactions').upsert(rows, { onConflict: 'tx_hash' });
  }

  /* ---------- 2.  Learn patterns ---------- */
  async analyzePatterns() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_address', this.userAddress);

    if (!data) return;

    const avg = data.reduce((s, t) => s + +t.amount_in, 0) / data.length || 0;

    await supabase.from('learned_patterns').upsert({
      user_address: this.userAddress,
      avg_trade_size: avg,
      top_pairs: ['ETH/USDT'], // TODO: parse logs
      risk_bucket: data.length > 20 ? 'high' : 'moderate',
      last_seen: new Date().toISOString(),
    });
  }

  /* ---------- 3.  Handle NL command ---------- */
  async handleCommand(cmd: string) {
    const lower = cmd.toLowerCase();
    if (lower.includes('yield')) return this.buildYieldPlan();
    return { reply: 'Unknown intent' };
  }

  private async buildYieldPlan() {
    const { data: p } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('user_address', this.userAddress)
      .single();

    return {
      type: 'strategy',
      title: 'Low-risk yield',
      steps: [
        { protocol: 'staking', action: 'stake', token: 'MBTC', amount: '10' },
      ],
    };
  }
}