const { GrumpkinScalar, Schnorr } = require("@aztec/aztec.js");
const fs = require("fs");

async function generateNoirKeypair() {
  const sk = GrumpkinScalar.random();
  const schnorr = new Schnorr();
  const pk_raw = await schnorr.computePublicKey(sk); // { x: Fr, y: Fr }
  const pk = generateKeyBytes(pk_raw);

  return { sk, pk }; // pk.x and pk.y are Fr (the same field as Noir `Field`)
}

function writeKeyToFile(sk) {
    fs.writeFileSync("secret_key.txt", sk.toBuffer().toString("hex"));
}

function readKeyFromFile() {
    const sk = fs.readFileSync("secret_key.txt", "hex");
    return sk;
}

function frTo32Bytes(f) {
    const buf = f.toBuffer(); // usually 32 bytes
    if (buf.length !== 32) {
        throw new Error(`Fr.toBuffer() expected 32 bytes, got ${buf.length}`);
    }
    return buf;
}
  
function generateKeyBytes(pk) {
    const xBytes = frTo32Bytes(pk.x);
    const yBytes = frTo32Bytes(pk.y);

    const pubBytes = new Uint8Array(64);
    pubBytes.set(xBytes, 0);
    pubBytes.set(yBytes, 32);

    return Array.from(pubBytes); // pubBytes matches your `[u8; 64]` layout
}

module.exports = {
  generateNoirKeypair,
  writeKeyToFile,
  readKeyFromFile,
  generateKeyBytes
};