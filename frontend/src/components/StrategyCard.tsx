'use client';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAccount } from 'wagmi';

export default function StrategyCard() {
  const { address } = useAccount();
  const { data } = usePortfolio(address);

  if (!data) return <p>Loading…</p>;
  return (
    <div className="text-sm">
      <h3 className="font-bold mb-2">Live Positions</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}