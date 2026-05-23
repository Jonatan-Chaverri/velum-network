require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc", // your dev node endpoint
      accounts: [process.env.ACCOUNT_PRIVATE_KEY],
    },
  },
};
