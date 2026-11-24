// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReentrancyBank
 * @notice SWC-107: Reentrancy vulnerability fixture.
 * State update occurs AFTER the external call, violating Checks-Effects-Interactions.
 */
contract ReentrancyBank {
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be > 0");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");

        // Vulnerability (SWC-107): External call happens before state update
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0;
        emit Withdrawn(msg.sender, balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
