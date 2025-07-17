// src/components/TokenBalances.tsx
'use client';

import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useUserWallet } from '@/hooks/useUserWallet';
import { formatAddress } from '@/lib/utils'; // Assuming you have a formatAddress utility

// A small component for a single token's balance
const BalanceDisplay = ({ symbol, balance }: { symbol: string, balance: bigint }) => {
    // Format the bigint to a string with a few decimal places for display
    const formattedBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-md">
            {/* You can replace this with actual token icon SVGs later */}
            <div className="w-5 h-5 bg-gray-600 rounded-full"></div> 
            <span className="font-mono font-semibold text-gray-200">{formattedBalance}</span>
            <span className="text-sm font-medium text-gray-400">{symbol}</span>
        </div>
    );
};


export default function TokenBalances() {
  const { address, isConnected } = useAccount();
  const { data: balances, isLoading, error } = useUserWallet(address);

  // Don't render anything if the user isn't connected
  if (!isConnected) {
    return null;
  }

  // Show a loading state while fetching balances
  if (isLoading) {
    return <div className="text-sm text-gray-400 animate-pulse">Loading Balances...</div>;
  }

  // Handle potential errors
  if (error || !balances) {
    return <div className="text-sm text-red-400">Error loading balances</div>;
  }

  return (
    <div className="flex items-center gap-3">
        <BalanceDisplay symbol="METH" balance={balances.meth} />
        <BalanceDisplay symbol="MBTC" balance={balances.mbtc} />
    </div>
  );
}