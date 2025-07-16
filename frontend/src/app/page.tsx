// src/app/page.tsx
'use client';

import ChatBox from '@/components/ChatBox';
import StrategyCard from '@/components/StrategyCard';

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-3xl font-bold">MemFi AI Assistant</h1>
      <ChatBox />
      <StrategyCard />
    </div>
  );
}