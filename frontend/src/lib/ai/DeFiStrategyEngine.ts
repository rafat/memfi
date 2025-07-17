// src/lib/ai/DeFiStrategyEngine.ts
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { Tables } from "../supabase/database.types";
import { WalletBalances } from "@/hooks/useUserWallet"; // Assuming you created this hook
import {ethers} from "ethers";

// Define the precise JSON schema the AI must return. This is crucial for function calling.
const StrategySchema = {
  name: "DeFiStrategy",
  description: "A multi-step DeFi strategy based on user intent and profile.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "A concise, human-readable title for the strategy.",
      },
      reasoning: {
        type: "string",
        description: "A step-by-step explanation of why this strategy was chosen for this specific user.",
      },
      steps: {
        type: "array",
        description: "The sequence of on-chain actions to execute.",
        items: {
          type: "object",
          properties: {
            protocol: {
              type: "string",
              enum: ["amm", "lending", "staking"],
              description: "The protocol to interact with for this step.",
            },
            action: {
              type: "string",
              enum: ["swap", "lend", "stake", "borrow", "repay", "unstake"],
              description: "The specific action to perform.",
            },
            token_in: {
              type: "string",
              description: "The symbol of the token to use (e.g., 'METH', 'MBTC')."
            },
            amount_in_percent: {
              type: "number",
              description: "The percentage of the user's `token_in` balance to use for this step (0-100).",
            },
            token_out: {
                type: "string",
                description: "The symbol of the token to receive (for swaps)."
            }
          },
          required: ["protocol", "action", "token_in", "amount_in_percent"],
        },
      },
    },
    required: ["title", "reasoning", "steps"],
  },
};

// Define a TypeScript type for the parsed strategy for type safety
export type ParsedStrategy = {
  title: string;
  reasoning: string;
  steps: {
    protocol: 'amm' | 'lending' | 'staking';
    action: 'swap' | 'lend' | 'stake' | 'borrow' | 'repay' | 'unstake';
    token_in: string;
    amount_in_percent: number;
    token_out?: string;
  }[];
};

export class DeFiStrategyEngine {
  private llm: ChatOpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }
    this.llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2, // Low temp for predictable, structured output
    });
  }

  public async generateStrategy(
    command: string,
    patterns: Tables<'learned_patterns'> | null,
    balances: WalletBalances,
    history: Tables<'strategies'>[]
  ): Promise<ParsedStrategy> {
    
    const outputParser = new JsonOutputFunctionsParser();
    const prompt = this.buildPrompt();

    // Bind the function calling schema to the LLM
    const chain = prompt.pipe(
      this.llm.bind({
        functions: [StrategySchema],
        function_call: { name: "DeFiStrategy" },
      })
    ).pipe(outputParser);

    // Prepare context for the prompt
    const context = {
        command,
        userProfile: JSON.stringify(patterns, null, 2),
        walletBalances: JSON.stringify({
            METH: ethers.formatEther(balances.meth),
            MBTC: ethers.formatEther(balances.mbtc),
        }, null, 2),
        strategyHistory: JSON.stringify(history.slice(0, 3).map(h => ({title: h.title, roi: h.roi_pct, status: h.status})), null, 2)
    };

    console.log("[AI Engine] Invoking LLM with context:", context);
    const result = await chain.invoke(context);
    return result as ParsedStrategy;
  }

  private buildPrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        You are an expert DeFi strategy agent called MemFi. Your goal is to help users by generating safe, effective, and personalized multi-step DeFi strategies.
        
        You have access to the user's profile, their current wallet balances, and their recent strategy history.
        
        RULES:
        1. Analyze the user's command in the context of their profile and wallet.
        2. Create a logical, step-by-step plan to achieve their goal.
        3. ALWAYS use the "DeFiStrategy" function to format your response. Do not respond in any other way.
        4. Base your recommendations on the assets the user actually holds.
        5. For amounts, use percentages of the user's balance of the input token. This is safer.
        6. Keep strategies simple (1-3 steps) unless the user is a power user.
        7. Your reasoning should be clear, concise, and justify each step.
        
        AVAILABLE ACTIONS:
        - protocol 'amm': action 'swap' (requires token_in, token_out, amount_in_percent)
        - protocol 'lending': action 'lend' (requires token_in, amount_in_percent)
        - protocol 'staking': action 'stake' (requires token_in, amount_in_percent)
      `),
      HumanMessagePromptTemplate.fromTemplate(`
        USER PROFILE (Learned Patterns):
        {userProfile}

        WALLET BALANCES:
        {walletBalances}
        
        RECENT STRATEGY HISTORY (for learning):
        {strategyHistory}
        
        USER COMMAND:
        "{command}"
      `),
    ]);
  }
}