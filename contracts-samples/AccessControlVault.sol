// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessControlVault
 * @notice SWC-105: Unprotected Ether Withdrawal / Missing Access Control.
 * withdrawAll() lacks onlyOwner or role verification, allowing any caller to drain funds.
 */
contract AccessControlVault {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    // Vulnerability (SWC-105): Missing onlyOwner modifier or caller check
    function withdrawAll(address payable recipient) external {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        recipient.transfer(balance);
        emit Withdrawn(recipient, balance);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
