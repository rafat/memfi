import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user');
  const { data } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_address', user)
    .order('created_at', { ascending: false });
  return NextResponse.json(data);
}