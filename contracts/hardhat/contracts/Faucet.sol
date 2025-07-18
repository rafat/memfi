// contracts/Faucet.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Faucet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    IERC20 public immutable methToken;
    IERC20 public immutable mbtcToken;

    // Cooldown period in seconds (5 minutes)
    uint256 public constant COOLDOWN_PERIOD = 5 minutes;
    
    // Dispense amounts (with 18 decimals)
    uint256 public constant METH_AMOUNT = 1000 * 1e18;
    uint256 public constant MBTC_AMOUNT = 50 * 1e18;

    // Fee required to use the faucet
    uint256 public constant CLAIM_FEE = 0.1 ether;

    // Mapping to track when a user can next claim tokens
    mapping(address => uint256) public nextClaimTime;

    // --- Events ---

    event TokensClaimed(address indexed user, uint256 nextClaimTime);
    event Withdrawn(address indexed owner, uint256 amount);

    // --- Constructor ---

    constructor(address _methAddress, address _mbtcAddress) Ownable(msg.sender) {
        methToken = IERC20(_methAddress);
        mbtcToken = IERC20(_mbtcAddress);
    }

    // --- Core Faucet Logic ---

    /**
     * @notice Allows a user to claim METH and MBTC by paying a fee.
     * @dev Enforces a 5-minute cooldown per address.
     */
    function requestTokens() external payable nonReentrant {
        // 1. Check if the correct fee is paid
        require(msg.value == CLAIM_FEE, "Faucet: Invalid fee paid");

        // 2. Check if the cooldown period has passed for the user
        require(block.timestamp >= nextClaimTime[msg.sender], "Faucet: Cooldown period is still active");

        // 3. Update the user's next claim time
        nextClaimTime[msg.sender] = block.timestamp + COOLDOWN_PERIOD;

        // 4. Check if the faucet has enough tokens to dispense
        require(methToken.balanceOf(address(this)) >= METH_AMOUNT, "Faucet: Not enough METH supply");
        require(mbtcToken.balanceOf(address(this)) >= MBTC_AMOUNT, "Faucet: Not enough MBTC supply");

        // 5. Dispense the tokens
        methToken.safeTransfer(msg.sender, METH_AMOUNT);
        mbtcToken.safeTransfer(msg.sender, MBTC_AMOUNT);

        // 6. Emit an event for logging
        emit TokensClaimed(msg.sender, nextClaimTime[msg.sender]);
    }

    // --- Administrative Functions ---

    /**
     * @notice Allows the owner to withdraw the collected BDAG fees.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Faucet: No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Faucet: Withdrawal failed");

        emit Withdrawn(owner(), balance);
    }
    
    // In case of emergency or to top up, owner can withdraw ERC20s.
    // This is not strictly necessary but good practice.
    function withdrawErc20(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}