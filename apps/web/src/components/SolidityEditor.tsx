"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Code2, Copy, Check } from "lucide-react";

const SAMPLE_CONTRACTS: Record<string, string> = {
  ReentrancyBank: `// SPDX-License-Identifier: MIT
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
}`,
  AccessControlVault: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessControlVault
 * @notice SWC-105: Unprotected Ether Withdrawal / Missing Access Control.
 * withdrawAll() lacks onlyOwner or authorization check, allowing any caller to drain funds.
 */
contract AccessControlVault {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    // Vulnerability (SWC-105): Missing onlyOwner modifier
    function withdrawAll(address payable recipient) external {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        recipient.transfer(balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`,
  UncheckedCall: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UncheckedCall
 * @notice SWC-104: Unchecked Call Return Value.
 * The boolean return value of low-level call is ignored, leading to silent state desynchronization.
 */
contract UncheckedCall {
    mapping(address => uint256) public rewards;

    function recordReward(address user, uint256 amount) external payable {
        rewards[user] += amount;
    }

    // Vulnerability (SWC-104): Return value of call is not checked
    function sendReward(address payable recipient) external {
        uint256 amount = rewards[recipient];
        require(amount > 0, "Zero reward");
        rewards[recipient] = 0;

        // Unchecked call return value
        recipient.call{value: amount}("");
    }
}`
};

interface SolidityEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export const SolidityEditor: React.FC<SolidityEditorProps> = ({ value, onChange }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-surfaceBorder bg-[#0c1017] overflow-hidden shadow-2xl">
      <div className="px-4 py-2.5 border-b border-surfaceBorder bg-[#111722] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Solidity Source Editor</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[11px]">{value.split("\n").length} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Load Sample:</span>
          {Object.keys(SAMPLE_CONTRACTS).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange(SAMPLE_CONTRACTS[name])}
              className="text-xs px-2.5 py-1 rounded-md bg-surfaceBorder/60 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 transition-all font-mono"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[380px]">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-4 bg-transparent text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-indigo-500/30"
          placeholder="// Paste Solidity code here or select a sample fixture above..."
        />
      </div>
    </div>
  );
};
