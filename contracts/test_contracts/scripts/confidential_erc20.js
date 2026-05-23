const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");
const prover = require("./prover_mock");
const verifier = require("./verifier_mock");
const weth = require("./weth");


const abiPath = path.join(process.cwd(), "abis", "confidential_erc20_abi_flat.txt");
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

async function registerUserKey(contract, publicKey, sk) {
  const tx = await contract.registerUserPk(publicKey);
  utils.writeKeyToFile(sk);
  console.log("✅ Tx hash:", tx.hash);
  console.log("✅ Secret key written to file");
  await tx.wait();
}

async function getUserPk(contract, user_address) {
  const pk = await contract.getUserPk(user_address);
  return pk;
}

async function deposit(
  contract, user_public_key, user_address, token, amount, current_balance, is_proof_valid = true
) {
  //await weth.getWETHTokens(amount);
  await weth.approveWETHTransfer(process.env.CONFIDENTIAL_ERC20_ADDRESS, amount);
  await verifier.setProofValidityMock(!is_proof_valid);

  console.log("\n\nDepositing 0.001 weth");
  const { public_inputs, proof } = prover.generateDepositWithdrawProof(
    user_public_key, user_address, token, amount, current_balance
  );

  const tx_deposit = await contract.deposit(
    Array.from(public_inputs),
    Array.from(proof),
  );
  const receipt = await tx_deposit.wait()
  console.log("tx: ", tx_deposit.hash);
  if (receipt.status !== 1) {
    throw new Error("Deposit failed");
  }
}

async function withdraw(
  contract, user_public_key, user_address, token, amount, current_balance, is_proof_valid = true
) {
  await verifier.setProofValidityMock(!is_proof_valid);

  console.log("\n\Withdrawing 0.001 weth");
  const { public_inputs, proof } = prover.generateDepositWithdrawProof(
    user_public_key, user_address, token, amount, current_balance
  );

  const tx_withdraw = await contract.withdraw(
    Array.from(public_inputs),
    Array.from(proof), 
  );
  const receipt = await tx_withdraw.wait()
  console.log("tx: ", tx_withdraw.hash);
  if (receipt.status !== 1) {
    throw new Error("Withdraw failed");
  }
}

async function transferConfidential(contract, to) {
  console.log("\n\nTransferring confidential");
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = process.env.CONFIDENTIAL_ERC20_ADDRESS;
  const contract = new hre.ethers.Contract(address, ABI, signer);
  
  // Initializing contract if needed
  const owner = await contract.getOwner();
  if (owner.toString() !== signer.address) {
    console.log("Initializing contract...");
    const tx = await contract.init(process.env.VERIFIER_ADDRESS, process.env.CHAIN_ID);
    console.log("✅ Tx hash:", tx.hash);
  } else {
    console.log("Contract already initialized");
  }

  // registering user public key if not already registered
  let pk = await getUserPk(contract, signer.address);
  if (pk.every((x) => x === 0n)) {
    const { sk, pk } = await utils.generateNoirKeypair();
    console.log("Public key generated:", pk);
    await registerUserKey(contract, pk, sk);
  } else {
    const sk = utils.readKeyFromFile();
    console.log("User already registered");
  }

  console.log("\n\nGetting initial values");
  console.log("Owner:", owner.toString());
  const verifier = await contract.getVerifier();
  console.log("Verifier:", verifier.toString());

  console.log("\n\nGetting initial balance of user");
  const balance = await contract.balanceOfEnc(process.env.WETH_TOKEN_ADDRESS, signer.address);
  const is_zero = balance.every((x) => x === 0n);
  if (is_zero) {
    console.log("Balance is zero");
  } else {
    console.log("Balance is not zero");
  }

  // Deposit 0.001 weth
  const amount = ethers.parseEther("0.001");
  await deposit(contract, pk, signer.address, process.env.WETH_TOKEN_ADDRESS, amount, balance);

  console.log("\n\nGetting balance of user");
  const balance_after = await contract.balanceOfEnc(process.env.WETH_TOKEN_ADDRESS, signer.address);
  const is_zero_after = balance_after.every((x) => x === 0n);
  if (is_zero_after) {
    console.log("Balance: ", balance_after);
    throw new Error("Balance is zero after deposit");
  }

  try {
    console.log("\n\nDepositing 0.001 weth with invalid proof");
    await deposit(contract, pk, signer.address, process.env.WETH_TOKEN_ADDRESS, amount, balance_after, false,);
    console.log("❌ Deposit successful");
  } catch (error) {
    console.log("✅ Deposit failed");
  }

  await withdraw(contract, pk, signer.address, process.env.WETH_TOKEN_ADDRESS, amount, balance_after);
}

main().catch(console.error);
