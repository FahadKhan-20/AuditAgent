// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UncheckedCall
 * @notice SWC-104: Unchecked Call Return Value.
 * The boolean return value of low-level call is ignored, leading to silent state desynchronization.
 */
contract UncheckedCall {
    mapping(address => uint256) public rewards;

    event RewardPaid(address indexed recipient, uint256 amount);

    function recordReward(address user, uint256 amount) external payable {
        rewards[user] += amount;
    }

    // Vulnerability (SWC-104): Return value of call is completely unchecked
    function sendReward(address payable recipient) external {
        uint256 amount = rewards[recipient];
        require(amount > 0, "Zero reward");
        
        rewards[recipient] = 0;

        // Unchecked call return value
        recipient.call{value: amount}("");
        emit RewardPaid(recipient, amount);
    }

    function getReward(address user) external view returns (uint256) {
        return rewards[user];
    }
}
