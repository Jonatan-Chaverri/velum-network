const hre = require("hardhat");

const weth_abi = [
    "function approve(address guy, uint256 wad) external returns (bool)",
    "function allowance(address src, address guy) external view returns (uint256)",
    "function balanceOf(address) external view returns (uint256)",
]

async function getWETHTokens(amount) {
    const [signer] = await hre.ethers.getSigners();
    await signer.sendTransaction({ to: process.env.WETH_TOKEN_ADDRESS, value: amount });
}
  
async function approveWETHTransfer(spender, amount) {
    console.log("Approving ETH transfer");
    const [signer] = await hre.ethers.getSigners();
    const weth = new hre.ethers.Contract(process.env.WETH_TOKEN_ADDRESS, weth_abi, signer);
    const result = await weth.approve(spender, amount);
    console.log("✅ Approved tx hash: ", result.hash);
    const allowance = await weth.allowance(signer.address, spender);
    console.log("Allowance:", allowance.toString());
    const balance = await weth.balanceOf(signer.address);
    console.log("WETH balance:", ethers.formatEther(balance));
}

module.exports = {
  getWETHTokens,
  approveWETHTransfer
};