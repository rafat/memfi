// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import NavBar from '@/components/NavBar';
import dynamic from 'next/dynamic'; // <<< Import dynamic

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MemFi – AI Memory DeFi',
  description: 'Personalized DeFi assistant on BlockDAG',
};

// <<< FIX: Dynamically import the providers with SSR turned off
const Web3Providers = dynamic(() => import('@/context/Web3Providers'), {
  ssr: false, 
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Providers> 
          <NavBar />
          <main className="min-h-screen bg-[#070E1B] text-white">
            {children}
          </main>
        </Web3Providers>
      </body>
    </html>
  );
}