// src/app/api/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BDAG_TESTNET } from '@/lib/contracts';
import PortfolioTrackerABI from '@/lib/contracts/abis/PortfolioTracker.json';
import { safeBigIntStringify } from '@/lib/utils';

export async function GET(req: NextRequest) {
   try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user')!;
    if (!user) {
        return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }
    const provider = new ethers.JsonRpcProvider(BDAG_TESTNET.rpc);
    const pt = new ethers.Contract(
      BDAG_TESTNET.contracts.PortfolioTracker,
      PortfolioTrackerABI,
      provider
    );
    const raw = await pt.getFullPortfolio(
      user,
      [BDAG_TESTNET.contracts.AMM],
      [BDAG_TESTNET.contracts.LendingPool],
      [BDAG_TESTNET.contracts.Staking]
    );

    const jsonString = safeBigIntStringify(raw);

    return new Response(jsonString, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });

  } catch (error: any) {
    console.error("Portfolio API Error:", error);
    return NextResponse.json({ error: error.message || "An internal server error occurred" }, { status: 500 });
  }
}