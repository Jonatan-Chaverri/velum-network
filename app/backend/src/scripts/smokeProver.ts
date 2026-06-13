// Smoke test: BSGS wasm + noir_js + bb.js all loadable from the backend (CJS + tsx).
import { readFileSync } from 'fs';
import path from 'path';

const bg = require('confidential-transfers/baby-giant/baby_giant_wasm_bg.js');

async function main() {
  const wasmPath = require.resolve('confidential-transfers/baby-giant/baby_giant_wasm_bg.wasm');
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), {
    './baby_giant_wasm_bg.js': bg,
  });
  bg.__wbg_set_wasm(instance.exports);
  (instance.exports as any).__wbindgen_start?.();

  const point: string = bg.grumpkin_point('98765');
  const [x, y] = point.split('|');
  console.log('bsgs recovered:', bg.grumpkin_bsgs_str(x, y).toString());

  const { Noir } = require('@noir-lang/noir_js');
  const { UltraHonkBackend } = require('@aztec/bb.js');
  const circuitPath = path.resolve(__dirname, '../../circuits/transfer.json');
  const circuit = JSON.parse(readFileSync(circuitPath, 'utf8'));
  console.log('transfer circuit loaded, bytecode length:', circuit.bytecode.length);
  console.log('Noir:', typeof Noir, '| UltraHonkBackend:', typeof UltraHonkBackend);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
