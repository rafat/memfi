'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalances from './TokenBalances';

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-gray-900 text-white shadow-md">
      <div className="text-xl font-bold">MemFi</div>
      
      <div className="flex items-center gap-4">
        <TokenBalances />
        <ConnectButton 
          showBalance={{
            smallScreen: true,
            largeScreen: true,
          }}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </nav>
  );
}