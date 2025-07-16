import { NextRequest, NextResponse } from 'next/server';
import { AIMemoryAgent } from '@/lib/ai/AIMemoryAgent';

export async function POST(req: NextRequest) {
  const { userAddress, command } = await req.json();
  const agent = new AIMemoryAgent(userAddress);
  const res = await agent.handleCommand(command);
  return NextResponse.json(res);
}