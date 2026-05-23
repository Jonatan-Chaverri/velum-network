const hre = require("hardhat");

const verifier_abi = [
    "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external returns (bool)",
    "function setForceFail(bool _fail) external",
]

async function setProofValidityMock(value) {
    console.log("Setting validity of proof to:", !value);
    const [signer] = await hre.ethers.getSigners();
    const verifier = new hre.ethers.Contract(process.env.VERIFIER_ADDRESS, verifier_abi, signer);
    await verifier.setForceFail(value);
}

module.exports = {
  setProofValidityMock
};