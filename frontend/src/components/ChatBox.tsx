'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';

export default function ChatBox() {
  const { address } = useAccount();
  const [cmd, setCmd] = useState('');
  const [reply, setReply] = useState('');

  const send = async () => {
    const res = await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({ userAddress: address, command: cmd }),
    });
    const json = await res.json();
    setReply(JSON.stringify(json, null, 2));
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        className="border p-2 rounded"
        placeholder="Type a command..."
        value={cmd}
        onChange={(e) => setCmd(e.target.value)}
      />
      <button onClick={send} className="bg-blue-600 text-white px-4 py-2 rounded">
        Ask
      </button>
      <pre className="bg-gray-100 p-2 rounded">{reply}</pre>
    </div>
  );
}