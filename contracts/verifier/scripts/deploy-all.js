const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of all three verifier contracts...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error("❌ Insufficient balance. Please fund your account.");
  }

  const deployments = {};

  // Deploy DepositVerifier
  console.log("=".repeat(60));
  console.log("📦 Deploying DepositVerifier...");
  console.log("=".repeat(60));
  const DepositVerifier = await hre.ethers.getContractFactory("DepositVerifier");

  // Arbitrum supports large contracts - deploy with manual gas limit
  const depositVerifier = await DepositVerifier.deploy({
    gasLimit: 30000000 // 30M gas - Arbitrum can handle this
  });
  await depositVerifier.waitForDeployment();
  const depositAddress = await depositVerifier.getAddress();
  deployments.deposit = depositAddress;
  console.log("✅ DepositVerifier deployed at:", depositAddress);
  console.log();

  // Deploy WithdrawVerifier
  console.log("=".repeat(60));
  console.log("📦 Deploying WithdrawVerifier...");
  console.log("=".repeat(60));
  const WithdrawVerifier = await hre.ethers.getContractFactory("WithdrawVerifier");

  const withdrawVerifier = await WithdrawVerifier.deploy({
    gasLimit: 30000000 // 30M gas - Arbitrum can handle this
  });
  await withdrawVerifier.waitForDeployment();
  const withdrawAddress = await withdrawVerifier.getAddress();
  deployments.withdraw = withdrawAddress;
  console.log("✅ WithdrawVerifier deployed at:", withdrawAddress);
  console.log();

  // Deploy TransferVerifier
  console.log("=".repeat(60));
  console.log("📦 Deploying TransferVerifier...");
  console.log("=".repeat(60));
  const TransferVerifier = await hre.ethers.getContractFactory("TransferVerifier");

  const transferVerifier = await TransferVerifier.deploy({
    gasLimit: 30000000 // 30M gas - Arbitrum can handle this
  });
  await transferVerifier.waitForDeployment();
  const transferAddress = await transferVerifier.getAddress();
  deployments.transfer = transferAddress;
  console.log("✅ TransferVerifier deployed at:", transferAddress);
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("🎉 ALL VERIFIERS DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\n📋 Deployment Summary:");
  console.log("  Network:            ", hre.network.name);
  console.log("  Deployer:           ", deployer.address);
  console.log("  Block Number:       ", await hre.ethers.provider.getBlockNumber());
  console.log("\n📍 Contract Addresses:");
  console.log("  DepositVerifier:    ", deployments.deposit);
  console.log("  WithdrawVerifier:   ", deployments.withdraw);
  console.log("  TransferVerifier:   ", deployments.transfer);

  // Save deployment info to JSON
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    contracts: deployments
  };

  const fs = require('fs');
  fs.writeFileSync(
    './deployments.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployments.json");

  // If on a live network, wait for confirmations
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for 5 block confirmations...");
    await depositVerifier.deploymentTransaction()?.wait(5);
    await withdrawVerifier.deploymentTransaction()?.wait(5);
    await transferVerifier.deploymentTransaction()?.wait(5);
    console.log("✅ All contracts confirmed on chain");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Deployment Complete! ✨");
  console.log("=".repeat(60));

  return deployments;
}

main()
  .then((deployments) => {
    console.log("\n🚀 You can now use these verifier addresses in your contracts:");
    console.log("   DepositVerifier:  ", deployments.deposit);
    console.log("   WithdrawVerifier: ", deployments.withdraw);
    console.log("   TransferVerifier: ", deployments.transfer);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
