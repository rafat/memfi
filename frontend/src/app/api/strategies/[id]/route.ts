// src/app/api/strategies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/supabase-server';

// This endpoint updates a specific strategy or its steps
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const strategyId = parseInt(params.id, 10);
    const { type, payload } = await req.json();

    if (!strategyId || !type || !payload) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    switch (type) {
      // Used to update a step with its transaction hash after it's mined
      case 'UPDATE_STEP_TX':
        const { step_order, tx_hash } = payload;
        const { error: stepError } = await supabaseServer
          .from('strategy_steps')
          .update({ tx_hash })
          .match({ strategy_id: strategyId, step_order });

        if (stepError) throw new Error(stepError.message);
        return NextResponse.json({ message: 'Step updated successfully' });

      // Used to update the final status of the strategy (completed or failed)
      case 'UPDATE_STRATEGY_STATUS':
        const { status } = payload;
        const updateData: { status: string; executed_at?: string } = { status };
        if (status === 'completed') {
            updateData.executed_at = new Date().toISOString();
        }
        
        const { error: strategyError } = await supabaseServer
          .from('strategies')
          .update(updateData)
          .eq('id', strategyId);
        
        if (strategyError) throw new Error(strategyError.message);
        return NextResponse.json({ message: 'Strategy status updated' });
      
      default:
        return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API Strategies PATCH Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}