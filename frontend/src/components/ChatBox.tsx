// src/components/ChatBox.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Tables } from '@/lib/supabase/database.types';

// Define the structure of a chat message
interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  strategy?: { // Attach strategy previews to agent messages
    id: number;
    title: string;
    steps: Tables<'strategy_steps'>[];
  }
}

export default function ChatBox() {
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (command?: string) => {
    const userCommand = command || input;
    if (!userCommand.trim() || !address) return;

    setIsLoading(true);
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userCommand }];
    setMessages(newMessages);
    setInput('');

    // Call the agent API
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: address, command: userCommand, action: 'command' }),
    });
    const agentResponse = await res.json();
    
    // Add agent's response to the chat
    if (agentResponse.type === 'strategy_preview') {
      setMessages([...newMessages, { role: 'agent', content: "Here's a strategy I've prepared for you:", strategy: agentResponse.strategy }]);
    } else {
      setMessages([...newMessages, { role: 'agent', content: agentResponse.message || 'Sorry, something went wrong.' }]);
    }
    setIsLoading(false);
  };

  const handleFeedback = async (strategyId: number, accepted: boolean) => {
    // Disable buttons after clicking
    setMessages(prev => prev.map(msg => msg.strategy?.id === strategyId ? {...msg, strategy: undefined} : msg));
    
    await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userAddress: address,
            action: 'feedback',
            payload: { strategyId, accepted }
        }),
    });
    // Add a confirmation message to the chat
    setMessages(prev => [...prev, {role: 'system', content: `Strategy ${accepted ? 'accepted' : 'rejected'}. ${accepted ? "Let's get this done!" : "I'll learn from this."}`}])
    // TODO: If accepted, trigger the on-chain transaction sequence here using wagmi/viem writeContract hooks.
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[70vh] bg-gray-900 rounded-lg shadow-xl border border-gray-700">
      {/* Message display area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md p-3 rounded-lg ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' 
                  : msg.role === 'agent' ? 'bg-gray-700 text-gray-200' 
                  : 'bg-transparent text-gray-400 italic text-center w-full'
              }`}>
                <p>{msg.content}</p>
                {/* Render Strategy Preview */}
                {msg.role === 'agent' && msg.strategy && (
                  <div className="mt-3 border-t border-gray-600 pt-3">
                    <h4 className="font-bold text-md mb-2">{msg.strategy.title}</h4>
                    <ul className="list-decimal list-inside text-sm space-y-1">
                      {msg.strategy.steps.map((step: any) => (
                        <li key={step.step_order}>
                          {`${step.action} ${step.amount_in || ''} ${step.token_in || ''}`} on {step.protocol}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => handleFeedback(msg.strategy!.id, true)} className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded">Accept & Execute</button>
                        <button onClick={() => handleFeedback(msg.strategy!.id, false)} className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                    <span className="animate-pulse">Thinking...</span>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={address ? 'Ask me anything...' : 'Please connect your wallet'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={!address || isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
            disabled={!address || isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}