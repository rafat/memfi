// src/components/NavBar.tsx
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalances from './TokenBalances';
import Link from 'next/link';
import { useAccount } from 'wagmi'; // <<< Import useAccount
import { useEffect } from 'react'; // <<< Import useEffect

export default function NavBar() {
  const { address, isConnected } = useAccount();

  // <<< FIX: This effect runs whenever the connection status changes.
  useEffect(() => {
    // If the user has just connected and we have their address...
    if (isConnected && address) {
      // ...ping our API to create a user record if one doesn't exist.
      console.log(`[User] Wallet connected: ${address}. Initializing session.`);
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address }),
      }).catch(err => console.error("Failed to initialize user session:", err));
    }
  }, [isConnected, address]); // Dependencies: run when these change

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-gray-900 text-white shadow-md">
      <Link href="/" className="text-xl font-bold">MemFi</Link>
      <div className="flex items-center gap-4">
          <TokenBalances />
          <ConnectButton 
            showBalance={{ smallScreen: true, largeScreen: true }}
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          />
      </div>
    </nav>
  );
}