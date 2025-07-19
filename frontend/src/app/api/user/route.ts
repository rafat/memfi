// src/app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/supabase-server';
import { ethers } from 'ethers';

// This endpoint is called once when the user connects their wallet.
export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();
    if (!userAddress) {
      return NextResponse.json({ error: 'userAddress is required' }, { status: 400 });
    }
    const checksummedAddress = ethers.getAddress(userAddress);

    // "Upsert" the user. If the address already exists, it does nothing.
    // If it's a new address, it creates a record.
    const { error } = await supabaseServer
      .from('users')
      .upsert({ user_address: checksummedAddress });

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: 'User session initialized' });

  } catch (error: any) {
    console.error('[API User POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}