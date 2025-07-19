// lib/contracts/abis/index.ts
import type { Abi } from 'viem';

import AMM from './AMM.json';
import LendingPool from './LendingPool.json';
import MultiTokenPriceOracle from './MultiTokenPriceOracle.json';
import PortfolioTracker from './PortfolioTracker.json';
import Staking from './Staking.json';
import Faucet from './Faucet.json';

export const AMM_ABI = AMM as Abi;
export const LendingPool_ABI = LendingPool as Abi;
export const MultiTokenPriceOracle_ABI = MultiTokenPriceOracle as Abi;
export const PortfolioTracker_ABI = PortfolioTracker as Abi;
export const Staking_ABI = Staking as Abi;
export const Faucet_ABI = Faucet as Abi;