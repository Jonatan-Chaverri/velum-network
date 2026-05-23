const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of HonkVerifier...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Insufficient balance. Please fund your account.");
  }

  // Deploy HonkVerifier (the contract in UltraVerifier.sol)
  console.log("\nDeploying HonkVerifier contract...");
  const HonkVerifier = await hre.ethers.getContractFactory("HonkVerifier");
  const verifier = await HonkVerifier.deploy();
  
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  console.log("\n✅ HonkVerifier deployed successfully!");
  console.log("Contract address:", verifierAddress);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: verifierAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // If on a live network, wait for a few block confirmations
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await verifier.deploymentTransaction()?.wait(5);
    console.log("✅ Contract confirmed on chain");
  }

  return verifierAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log("HonkVerifier address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

