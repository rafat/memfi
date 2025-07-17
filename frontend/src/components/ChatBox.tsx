// src/components/ChatBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useStrategyExecution } from '@/hooks/useStrategyExecution';
import { ethers } from 'ethers';

// --- Type Definitions for Clarity ---

// The structure of a single step within a strategy preview
type StrategyStep = {
  step_order: number;
  protocol: string;
  action: string;
  token_in: string;
  amount_in: string; // Comes as a string from the API
  token_out: string | null;
};

// The structure of a strategy object attached to an agent message
type StrategyPreview = {
  id: number;
  title: string;
  reasoning: string;
  steps: StrategyStep[];
};

// The structure of a single message in our chat history
interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  strategy?: StrategyPreview;
}

// --- The Component ---

export default function ChatBox() {
  const { address } = useAccount();
  
  // State for managing the chat interface
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Hook for managing the on-chain execution lifecycle
  const { 
    executeStrategy, 
    status: executionStatus, 
    currentStep, 
    error: executionError, 
    isConfirming,
    txHash 
  } = useStrategyExecution();

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Effect to automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentLoading]);

  // --- Core Functions ---

  const handleSendMessage = async () => {
    const userCommand = input;
    if (!userCommand.trim() || !address) return;

    // Add user's message to the chat history
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userCommand }];
    setMessages(newMessages);
    setInput('');
    setIsAgentLoading(true);

    try {
      // Call the agent API to get a response or strategy
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, command: userCommand }),
      });

      if (!res.ok) {
        throw new Error("The AI agent failed to respond.");
      }
      
      const agentResponse = await res.json();
      
      // Add the agent's response to the chat history
      if (agentResponse.type === 'strategy_preview') {
        setMessages([...newMessages, { 
          role: 'agent', 
          content: agentResponse.strategy.reasoning, // The reasoning is the main content
          strategy: agentResponse.strategy 
        }]);
      } else {
        setMessages([...newMessages, { 
          role: 'agent', 
          content: agentResponse.message || 'Sorry, something went wrong.' 
        }]);
      }
    } catch (error) {
        console.error("Failed to fetch from agent API:", error);
        setMessages([...newMessages, { role: 'agent', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
        setIsAgentLoading(false);
    }
  };

  const handleAcceptStrategy = (strategy: StrategyPreview) => {
    // Hide the accept/reject buttons for this strategy to prevent re-clicks
    setMessages(prev => prev.map(msg => 
        msg.strategy?.id === strategy.id 
            ? { ...msg, strategy: undefined, content: `${msg.content}\n\n*You accepted this strategy.*` } 
            : msg
    ));
    
    // Kick off the execution process using our hook
    executeStrategy(strategy);
  };

  // --- Render Functions ---

  // A helper component to render the strategy preview card
  const StrategyPreviewCard = ({ strategy }: { strategy: StrategyPreview }) => (
    <div className="mt-3 border-t border-gray-600 pt-3 bg-gray-800/50 rounded-lg p-3">
      <h4 className="font-bold text-md mb-2">{strategy.title}</h4>
      <ul className="list-decimal list-inside text-sm space-y-1 mb-4">
        {strategy.steps.map((step) => (
          <li key={step.step_order}>
            {`${step.action.charAt(0).toUpperCase() + step.action.slice(1)} 
             ${ethers.formatEther(step.amount_in)} ${step.token_in}
             ${step.action === 'swap' ? `for ${step.token_out}` : ''}
             on ${step.protocol}`}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button 
          onClick={() => handleAcceptStrategy(strategy)} 
          className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md font-semibold"
        >
          Accept & Execute
        </button>
        <button 
          // TODO: Implement feedback logic if needed
          className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md font-semibold"
        >
          Reject
        </button>
      </div>
    </div>
  );

  // A helper component to show the live status of on-chain execution
  const ExecutionStatusDisplay = () => {
    if (executionStatus === 'idle' || executionStatus === 'completed') return null;

    let statusText = "";
    if (executionStatus === 'executing') statusText = `Executing step ${currentStep}...`;
    if (isConfirming) statusText = `Waiting for confirmation for step ${currentStep}...`;
    if (executionStatus === 'failed') statusText = `Execution failed on step ${currentStep}.`;

    return (
        <div className="text-center text-sm text-yellow-400 p-2 bg-yellow-900/50 rounded-lg my-2 animate-pulse">
            <p>{statusText}</p>
            {txHash && (
                <a 
                    href={`https://primordial.bdagscan.com/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:underline text-xs"
                >
                    View on Explorer
                </a>
            )}
            {executionError && <p className="text-red-400 mt-1">{executionError}</p>}
        </div>
    );
  };


  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[80vh] bg-[#0d1629] rounded-lg shadow-xl border border-gray-700">
      {/* Message display area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-md p-3 rounded-lg text-left ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' 
                  : msg.role === 'agent' ? 'bg-gray-700 text-gray-200' 
                  : 'bg-transparent text-gray-500 italic text-center w-full'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'agent' && msg.strategy && <StrategyPreviewCard strategy={msg.strategy} />}
              </div>
            </div>
          ))}
          {isAgentLoading && (
            <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                    <span className="animate-pulse">MemFi is thinking...</span>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Live status display area */}
      <ExecutionStatusDisplay />
      
      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            placeholder={address ? 'Suggest a high-yield strategy for my MBTC...' : 'Please connect your wallet'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isAgentLoading && handleSendMessage()}
            disabled={!address || isAgentLoading || executionStatus !== 'idle'}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={!address || isAgentLoading || executionStatus !== 'idle'}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}