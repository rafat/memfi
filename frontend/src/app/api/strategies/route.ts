// src/app/api/strategies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/supabase-server'; // Use server client for writes
import { ethers } from 'ethers';

// This function handles the initial creation of a strategy record when execution begins.
export async function POST(req: NextRequest) {
    try {
        const { userAddress, strategy } = await req.json();
        const checksummedAddress = ethers.getAddress(userAddress);

        // 1. Create the main strategy record
        const { data: newStrategy, error: strategyError } = await supabaseServer
            .from('strategies')
            .insert({
                user_address: checksummedAddress,
                title: strategy.title,
                intent: { command: strategy.command, reasoning: strategy.reasoning } as any,
                status: 'submitted', // Mark as submitted immediately
            })
            .select('id') // Only select the ID we need
            .single();

        if (strategyError || !newStrategy) {
            throw new Error(strategyError?.message || "Failed to create strategy record.");
        }

        // 2. Create the associated step records
        const stepsToInsert = strategy.steps.map((step: any, index: number) => ({
            strategy_id: newStrategy.id,
            step_order: index + 1,
            protocol: step.protocol,
            action: step.action,
            token_in: step.token_in,
            token_out: step.token_out || null,
            amount_in: step.amount_in,
        }));

        const { error: stepsError } = await supabaseServer.from('strategy_steps').insert(stepsToInsert);

        if (stepsError) {
            // Rollback or handle partial insertion if necessary (for now, just log)
            console.error("Failed to insert strategy steps:", stepsError);
            throw new Error(stepsError.message);
        }

        // 3. Return the new strategy ID to the frontend hook
        return NextResponse.json({ strategyId: newStrategy.id });

    } catch (error: any) {
        console.error('[API Strategies POST Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}