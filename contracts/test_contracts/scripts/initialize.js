const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const abiPath = path.join(process.cwd(), "abis", "confidential_erc20_abi_flat.txt");
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const address = process.env.CONFIDENTIAL_ERC20_ADDRESS;
    const contract = new hre.ethers.Contract(address, ABI, signer);
    
    // Initializing contract if needed
    const owner = await contract.getOwner();
    if (owner.toString() !== signer.address) {
      console.log("Initializing contract...");
      const tx = await contract.init(
        process.env.DEPOSIT_VERIFIER_ADDRESS,
        process.env.WITHDRAW_VERIFIER_ADDRESS,
        process.env.TRANSFER_VERIFIER_ADDRESS
      );
      console.log("✅ Tx hash:", tx.hash);
    } else {
      console.log("Contract already initialized, updating verifiers..");
      await contract.setVerifier(
        process.env.DEPOSIT_VERIFIER_ADDRESS,
        process.env.WITHDRAW_VERIFIER_ADDRESS,
        process.env.TRANSFER_VERIFIER_ADDRESS
      );
    }
}

main().catch(console.error);
