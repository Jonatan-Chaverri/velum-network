const hre = require("hardhat");

// Deploys only the Withdraw and Transfer verifiers (the Deposit circuit's VK
// did not change, so the already-deployed DepositVerifier stays valid).
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  const WithdrawVerifier = await hre.ethers.getContractFactory("WithdrawVerifier");
  const withdrawVerifier = await WithdrawVerifier.deploy({ gasLimit: 30000000 });
  await withdrawVerifier.waitForDeployment();
  console.log("WithdrawVerifier:", await withdrawVerifier.getAddress());

  const TransferVerifier = await hre.ethers.getContractFactory("TransferVerifier");
  const transferVerifier = await TransferVerifier.deploy({ gasLimit: 30000000 });
  await transferVerifier.waitForDeployment();
  console.log("TransferVerifier:", await transferVerifier.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
