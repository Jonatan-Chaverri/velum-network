
const { ethers } = require("ethers");
const { randomBytes } = require("crypto");
const { generateKeyBytes } = require("./utils.js");

function getDepositWithdrawPublicInputs(user_pubkey, user_address, token, amount, current_balance) {
  // ensure public key bytes are 64 (x||y)
  const userPubKeyBytes = Uint8Array.from(user_pubkey.map(b => Number(b)));

  const paddedUserAddr = ethers.zeroPadValue(user_address, 32);
  const paddedTokenAddr = ethers.zeroPadValue(token, 32);

  const splitToBytes = (arr, start, end) => Uint8Array.from(arr.slice(start, end).map(Number));

  // fake balances for demo
  const current_balance_x1_x = splitToBytes(current_balance, 0, 32);
  const current_balance_x1_y = splitToBytes(current_balance, 32, 64);
  const current_balance_x2_x = splitToBytes(current_balance, 64, 96);
  const current_balance_x2_y = splitToBytes(current_balance, 96, 128);
  const new_balance_x1_x = randomBytes(32);
  const new_balance_x1_y = randomBytes(32);
  const new_balance_x2_x = randomBytes(32);
  const new_balance_x2_y = randomBytes(32);

  // pack in the same order Noir expects
  const packedHex = ethers.solidityPacked(
    [
      "bytes32", "bytes32", // user_pubkey.x, y
      "bytes32", "bytes32", // current_balance_x1.x, y
      "bytes32", "bytes32", // current_balance_x2.x, y
      "bytes32", "bytes32", // new_balance_x1.x, y
      "bytes32", "bytes32", // new_balance_x2.x, y
      "bytes32", // user_address (20 bytes, but padded to 32)
      "bytes32", // token
      "uint256"  // amount
    ],
    [
      userPubKeyBytes.slice(0, 32),
      userPubKeyBytes.slice(32, 64),
      current_balance_x1_x, current_balance_x1_y,
      current_balance_x2_x, current_balance_x2_y,
      new_balance_x1_x, new_balance_x1_y,
      new_balance_x2_x, new_balance_x2_y,
      paddedUserAddr,
      paddedTokenAddr,
      amount
    ]
  );

  const packedBytes = ethers.getBytes(packedHex);
  return packedBytes;
}

function generateDepositWithdrawProof(user_pubkey, user_address, token, amount, current_balance) {
    const public_inputs = getDepositWithdrawPublicInputs(user_pubkey, user_address, token, amount, current_balance);
    const proof = randomBytes(32);
    return { public_inputs, proof };
}

module.exports = {
  generateDepositWithdrawProof
};