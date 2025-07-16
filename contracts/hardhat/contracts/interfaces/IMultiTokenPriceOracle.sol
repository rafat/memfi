// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMultiTokenPriceOracle {
    function getPrice(address) external view returns (uint256);
}
