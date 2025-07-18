// src/app/faucet/page.tsx
'use client';

import { useFaucet } from "@/hooks/useFaucet";
import { useAccount } from "wagmi";

// Helper to format the countdown timer
const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FaucetPage() {
    const { address, isConnected } = useAccount();
    const { 
        claimTokens,
        canClaim,
        cooldownRemaining,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        hash
    } = useFaucet();
    
    const isLoading = isPending || isConfirming;

    const getButtonText = () => {
        if (!isConnected) return "Please Connect Wallet";
        if (!canClaim) return `Cooldown: ${formatTime(cooldownRemaining)}`;
        if (isPending) return "Check your wallet...";
        if (isConfirming) return "Transaction mining...";
        return "Claim 1000 METH & 50 MBTC";
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <div className="w-full max-w-md p-8 bg-[#0d1629] border border-gray-700 rounded-lg shadow-xl">
                <h1 className="text-3xl font-bold mb-2">Testnet Faucet</h1>
                <p className="text-gray-400 mb-6">
                    Get some test tokens to try out the MemFi platform.
                    A small fee of 0.1 BDAG is required.
                </p>

                <button 
                    onClick={claimTokens}
                    disabled={!isConnected || isLoading || !canClaim}
                    className="w-full px-6 py-3 mb-4 text-lg font-semibold text-white bg-blue-600 rounded-lg
                               hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                               disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {getButtonText()}
                </button>

                {/* Status Messages */}
                {isConfirmed && (
                    <div className="text-green-400 mt-4">
                        <p>Success! Tokens have been sent to your wallet.</p>
                        <a 
                            href={`https://primordial.bdagscan.com/tx/${hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:underline text-sm"
                        >
                            View on Explorer
                        </a>
                    </div>
                )}
                {error && (
                    <div className="text-red-400 mt-4 break-words">
                        <p>An error occurred:</p>
                        <p className="text-xs">{error.message}</p>
                    </div>
                )}
            </div>
        </div>
    );
}