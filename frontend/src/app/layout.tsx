// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import Providers from '@/context/providers';
import NavBar from '@/components/NavBar'; // <── NEW

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MemFi – AI Memory DeFi',
  description: 'Personalized DeFi assistant on BlockDAG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NavBar /> {/* <── NEW */}
          <main className="min-h-screen bg-[#070E1B] text-white">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}