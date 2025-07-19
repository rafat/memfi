// src/components/ChatBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useStrategyExecution, AIStrategy } from '@/hooks/useStrategyExecution';
import { ethers } from 'ethers';
import { getErrorMessage } from '@/lib/utils';

// --- Type Definitions ---

// The structure of a single message in our chat history
interface ChatMessage {
  role: 'user' | 'agent' | 'system' | 'error';
  content: string;
  strategy?: AIStrategy; // Attach the AI's preview to agent messages
}

// --- The Component ---

export default function ChatBox() {
  const { address, isConnected } = useAccount();
  
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
    isExecuting, // A combined boolean for loading states
    txHash 
  } = useStrategyExecution();

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Effect to automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentLoading]);
  
  // Effect to add system messages based on execution status changes
  useEffect(() => {
    if (executionStatus === 'completed') {
      setMessages(prev => [...prev, { role: 'system', content: '✅ Strategy executed successfully!' }]);
    }
    if (executionStatus === 'failed' && executionError) {
      setMessages(prev => [...prev, { role: 'error', content: `Execution failed: ${executionError}` }]);
    }
  }, [executionStatus, executionError]);


  // --- Core Functions ---

  const handleSendMessage = async () => {
    const userCommand = input;
    if (!userCommand.trim() || !address) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userCommand }];
    setMessages(newMessages);
    setInput('');
    setIsAgentLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, command: userCommand }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "The AI agent failed to respond.");
      }
      
      const agentResponse = await res.json();
      
      if (agentResponse.type === 'strategy_preview') {
        setMessages([...newMessages, { 
          role: 'agent', 
          content: agentResponse.strategy.reasoning,
          strategy: agentResponse.strategy 
        }]);
      } else {
        setMessages([...newMessages, { role: 'agent', content: agentResponse.message || 'Sorry, something went wrong.' }]);
      }
    } catch (error) {
        console.error("Failed to fetch from agent API:", error);
        setMessages([...newMessages, { role: 'error', content: getErrorMessage(error) }]);
    } finally {
        setIsAgentLoading(false);
    }
  };

  const handleAcceptStrategy = (strategy: AIStrategy) => {
    // Hide the accept/reject buttons for this strategy to prevent re-clicks
    setMessages(prev => prev.map(msg => 
        msg.strategy?.title === strategy.title // Match by title as ID doesn't exist yet
            ? { ...msg, strategy: undefined, content: `${msg.content}\n\n*You accepted this strategy. Preparing for execution...*` } 
            : msg
    ));
    
    // Kick off the execution process using our hook
    executeStrategy(strategy);
  };
  
  const handleRejectStrategy = (strategy: AIStrategy) => {
    // Hide the buttons and provide feedback
    setMessages(prev => prev.map(msg => 
        msg.strategy?.title === strategy.title
            ? { ...msg, strategy: undefined, content: `${msg.content}\n\n*You rejected this strategy. I'll learn from this.*` } 
            : msg
    ));
    // TODO: Call the feedback API endpoint here if you implement it
  };

  // --- Render Functions ---

  const StrategyPreviewCard = ({ strategy }: { strategy: AIStrategy }) => (
    <div className="mt-3 border-t border-gray-600 pt-3 bg-gray-800/50 rounded-lg p-3">
      <h4 className="font-bold text-md mb-2">{strategy.title}</h4>
      <ul className="list-decimal list-inside text-sm space-y-1 mb-4">
        {strategy.steps.map((step, index) => (
          <li key={index}>
            {`${step.action.charAt(0).toUpperCase() + step.action.slice(1)} 
             ${step.amount_in_percent}% of your ${step.token_in}
             ${step.action === 'swap' ? ` for ${step.token_out}` : ''}
             on ${step.protocol}`}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button 
          onClick={() => handleAcceptStrategy(strategy)} 
          className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md font-semibold disabled:bg-gray-500"
          disabled={isExecuting}
        >
          Accept & Execute
        </button>
        <button 
          onClick={() => handleRejectStrategy(strategy)}
          className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md font-semibold disabled:bg-gray-500"
          disabled={isExecuting}
        >
          Reject
        </button>
      </div>
    </div>
  );

  const ExecutionStatusDisplay = () => {
    if (!isExecuting) return null;

    let statusText = "";
    if (executionStatus === 'creating') statusText = "Saving strategy to database...";
    if (executionStatus === 'executing') statusText = `Executing step ${currentStep}...`;
    if (executionStatus === 'waiting_receipt') statusText = `Waiting for confirmation for step ${currentStep}...`;

    return (
        <div className="text-center text-sm text-yellow-400 p-2 bg-yellow-900/50 rounded-lg my-2">
            <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{statusText}</span>
            </div>
            {txHash && (
                <a 
                    href={`https://primordial.bdagscan.com/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:underline text-xs block mt-1"
                >
                    View Last Transaction
                </a>
            )}
        </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[80vh] bg-[#0d1629] rounded-lg shadow-xl border border-gray-700">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-md p-3 rounded-lg text-left ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' 
                  : msg.role === 'agent' ? 'bg-gray-700 text-gray-200' 
                  : msg.role === 'system' ? 'bg-transparent text-green-400 italic text-center w-full'
                  : 'bg-transparent text-red-400 italic text-center w-full'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'agent' && msg.strategy && <StrategyPreviewCard strategy={msg.strategy} />}
              </div>
            </div>
          ))}
          {isAgentLoading && (
            <div className="flex justify-start"><div className="bg-gray-700 text-gray-200 p-3 rounded-lg"><span className="animate-pulse">MemFi is thinking...</span></div></div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <ExecutionStatusDisplay />
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            placeholder={isConnected ? 'Suggest a high-yield strategy...' : 'Please connect your wallet'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isAgentLoading && handleSendMessage()}
            disabled={!isConnected || isAgentLoading || isExecuting}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={!isConnected || isAgentLoading || isExecuting}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}