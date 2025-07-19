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
import { z } from "zod";


const StrategyZodSchema = z.object({
  title: z.string().describe("A concise, human-readable title for the strategy."),
  reasoning: z.string().describe("A step-by-step explanation of why this strategy was chosen for this specific user."),
  steps: z.array(z.object({
    protocol: z.enum(["amm", "lending", "staking"]),
    action: z.enum(["swap", "depositCollateral", "borrow", "repay", "stake", "unstake", "claimReward", "withdrawCollateral"]),
    token_in: z.string().optional().describe("The symbol of the token to use (e.g., 'METH', 'MBTC')."),
    amount_in_percent: z.number().optional().describe("The percentage of the user's `token_in` balance to use for this step (0-100)."),
    token_out: z.string().optional().describe("The symbol of the token to receive (for 'swap') or borrow (for 'borrow').")
  })).describe("The sequence of on-chain actions to execute."),
});

export type ParsedStrategy = z.infer<typeof StrategyZodSchema>;

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
    history: Tables<'strategies'>[],
    prices: { METH: bigint; MBTC: bigint; },
    onChainParams: {
        stakingRewardRate: bigint;
        collateralRatio: bigint;
        liquidationThreshold: bigint;
    }
  ): Promise<ParsedStrategy> {
    
    const outputParser = new JsonOutputFunctionsParser();
    const prompt = this.buildPrompt();

    // Bind the function calling schema to the LLM
    const chain = prompt.pipe(
      this.llm.withStructuredOutput(StrategyZodSchema)
    );

    // Prepare context for the prompt
    const context = {
        command,
        userProfile: JSON.stringify(patterns, null, 2),
        walletBalances: JSON.stringify({
            METH: ethers.formatEther(balances.meth),
            MBTC: ethers.formatEther(balances.mbtc),
        }, null, 2),
        marketPrices: JSON.stringify({
            METH_USD: ethers.formatEther(prices.METH),
            MBTC_USD: ethers.formatEther(prices.MBTC),
        }, null, 2),
        protocolParameters: JSON.stringify({
            staking: {
                // rewardRate is in MBTC per second (with 18 decimals)
                // Let's convert it to MBTC per day for better human readability.
                reward_mbtc_per_day: ethers.formatEther(onChainParams.stakingRewardRate * 60n * 60n * 24n)
            },
            lending: {
                collateralization_ratio_percent: onChainParams.collateralRatio.toString(),
                liquidation_threshold_percent: onChainParams.liquidationThreshold.toString()
            }
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
        You are an expert DeFi strategy agent called MemFi. Your goal is to help users by generating safe, effective, and personalized multi-step DeFi strategies based on the exact capabilities and LIVE parameters of the on-chain smart contracts.

        You have access to the user's profile, wallet balances, live market prices, live protocol parameters, and recent strategy history.

        --- CORE CAPABILITIES & ON-CHAIN PARAMETERS ---

        1.  **AMM Protocol (\`amm\`):**
            *   action: 'swap': Swaps METH for MBTC or vice-versa.

        2.  **Lending Protocol (\`lending\`):**
            *   **Constraint:** Collateral asset is MBTC. Borrowable asset is METH.
            *   action: 'depositCollateral': User deposits MBTC to be used as collateral.
            *   action: 'borrow': User borrows METH against their MBTC collateral. The amount is a percentage of their total borrowing power.
            *   action: 'repay': User repays their METH debt.
            *   action: 'withdrawCollateral': User withdraws their MBTC collateral.
            *   **Live Parameters:**
                *   collateralization_ratio_percent: A user must have this much collateral value for every 100 units of debt value. (e.g., 150 means $150 of collateral for $100 of debt).
                *   liquidation_threshold_percent: If the user's ratio of collateral value to debt value falls below this percentage, they can be liquidated.

        3.  **Staking Protocol (\`staking\`):**
            *   **Constraint:** The staking asset is METH. The reward asset is MBTC.
            *   action: 'stake': User stakes their METH tokens.
            *   action: 'unstake': User unstakes their METH tokens.
            *   action: 'claimReward': User claims their earned MBTC rewards.
            *   **Live Parameters:**
                *   reward_mbtc_per_day: The total amount of MBTC distributed to ALL stakers per day. An individual's share depends on their percentage of the total pool.

        --- STRATEGY GENERATION RULES ---

        1.  **Analyze Holistically:** Analyze the user's command in the context of their profile, balances, market prices, AND the live protocol parameters.
        2.  **Be Quantitative:** Use the live parameters in your reasoning. For example: "With the current reward rate, staking 100 METH could yield approximately X MBTC per day." or "Since the collateral ratio is 150%, your 1 MBTC deposit (worth $60,000) gives you $40,000 of borrowing power."
        3.  **Respect Constraints:** Your generated steps MUST adhere strictly to the capabilities. (e.g., ONLY stake METH, ONLY use MBTC as collateral).
        4.  **Use Percentages:** For all amounts, use \`amount_in_percent\` relative to the user's balance.
        5.  **Be Logical:** For complex strategies, include all necessary steps in the correct order.
        6.  **Format Correctly:** ALWAYS use the "DeFiStrategy" function to format your response. Your entire output must be only the valid JSON object.
        7.  **Provide Clear Reasoning:** Your reasoning must be detailed and justify why the strategy is suitable.
      `),
      HumanMessagePromptTemplate.fromTemplate(`
        --- USER CONTEXT ---

        LEARNED PATTERNS:
        {userProfile}

        WALLET BALANCES:
        {walletBalances}
        
        CURRENT MARKET PRICES (USD):
        {marketPrices}
        
        RECENT STRATEGY HISTORY (for learning from success/failure):
        {strategyHistory}
        
        --- USER COMMAND ---
        "{command}"
      `),
    ]);
  }
}