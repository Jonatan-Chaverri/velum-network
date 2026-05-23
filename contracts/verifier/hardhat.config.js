require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Optimize for size, not runtime efficiency
      },
      evmVersion: "london", // Arbitrum compatible
      viaIR: false, // Disable IR for smaller bytecode
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true, // For local testing
    },
    sepolia: {
      url: process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.ACCOUNT_PRIVATE_KEY ? [process.env.ACCOUNT_PRIVATE_KEY] : [],
      chainId: 421614, // Arbitrum Sepolia chain ID
      gas: "auto", // Let Arbitrum handle it
      gasPrice: "auto",
      allowUnlimitedContractSize: true, // Arbitrum supports larger contracts
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

