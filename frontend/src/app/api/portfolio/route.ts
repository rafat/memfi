// src/app/api/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BDAG_TESTNET } from '@/lib/contracts';
import PortfolioTrackerABI from '@/lib/contracts/abis/PortfolioTracker.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user')!;
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
  return NextResponse.json(raw);
}