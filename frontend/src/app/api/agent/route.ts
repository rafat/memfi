// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIMemoryAgent } from '@/lib/ai/AIMemoryAgent';

// This function will handle all interactions with the agent
export async function POST(req: NextRequest) {
  try {
    const { userAddress, command, action, payload } = await req.json();

    if (!userAddress || !action) {
      return NextResponse.json({ error: 'userAddress and action are required' }, { status: 400 });
    }

    const agent = new AIMemoryAgent(userAddress);

    // Route different agent actions based on the request
    switch (action) {
      case 'sync':
        // A simple way to trigger a background sync & analysis
        await agent.syncAndAnalyze();
        return NextResponse.json({ message: 'Sync and analysis complete.' });
      
      case 'command':
        if (!command) return NextResponse.json({ error: 'command is required' }, { status: 400 });
        const response = await agent.handleCommand(command);
        return NextResponse.json(response);
      
      case 'feedback':
        if (!payload || typeof payload.accepted !== 'boolean') {
            return NextResponse.json({ error: 'payload with strategyId and accepted boolean is required' }, { status: 400 });
        }
        await agent.recordFeedback(payload.strategyId, payload.accepted);
        return NextResponse.json({ message: 'Feedback recorded.' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API Agent Error]', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}