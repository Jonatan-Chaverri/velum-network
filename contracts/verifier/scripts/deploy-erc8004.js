const hre = require("hardhat");

// Deploys the official ERC-8004 IdentityRegistry (reference implementation by
// the 8004 team) behind a UUPS proxy on Arbitrum Sepolia:
//   1. bootstrap impl (sets owner)  2. proxy  3. upgrade to registry + initialize
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Bootstrap = await hre.ethers.getContractFactory("Erc8004Bootstrap");
  const bootstrap = await Bootstrap.deploy();
  await bootstrap.waitForDeployment();
  console.log("Bootstrap impl:", await bootstrap.getAddress());

  const Registry = await hre.ethers.getContractFactory("IdentityRegistryUpgradeable");
  const registryImpl = await Registry.deploy();
  await registryImpl.waitForDeployment();
  console.log("IdentityRegistry impl:", await registryImpl.getAddress());

  const initData = Bootstrap.interface.encodeFunctionData("initialize", [deployer.address]);
  const Proxy = await hre.ethers.getContractFactory("Erc8004Proxy");
  const proxy = await Proxy.deploy(await bootstrap.getAddress(), initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("Proxy:", proxyAddress);

  const upgradeCall = Registry.interface.encodeFunctionData("initialize", []);
  const proxyAsBootstrap = Bootstrap.attach(proxyAddress);
  const upgradeTx = await proxyAsBootstrap.upgradeToAndCall(await registryImpl.getAddress(), upgradeCall);
  await upgradeTx.wait();
  console.log("Upgraded + initialized:", upgradeTx.hash);

  const registry = Registry.attach(proxyAddress);
  console.log("name:", await registry.name(), "| symbol:", await registry.symbol());

  // Smoke test: register a probe agent and read back its URI
  const tx = await registry["register(string)"]("https://velum.network/probe.json");
  const receipt = await tx.wait();
  const registered = receipt.logs
    .map((log) => { try { return registry.interface.parseLog(log); } catch { return null; } })
    .find((parsed) => parsed && parsed.name === "Registered");
  console.log("smoke register agentId:", registered.args.agentId.toString());
  console.log("tokenURI:", await registry.tokenURI(registered.args.agentId));

  console.log("\nERC8004_IDENTITY_REGISTRY=" + proxyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
