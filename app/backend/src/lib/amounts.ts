/**
 * Amount unit conversions, mirrored from the frontend
 * (`app/frontend/lib/utils/agent-private-features.ts`).
 *
 * Display amounts (Service.price / Invoice.amount, Decimal(18,6)) are token
 * units. The proving circuits work in 12-decimal "proof units" capped at 40
 * bits; the ERC-20 (18 decimals) amount is proof amount x 10^6.
 */
export const AGENT_TOKEN_DECIMALS = 12;
export const ERC20_TRANSFER_SCALE = BigInt(1_000_000);
const MAX_PROOF_AMOUNT = (BigInt(1) << BigInt(40)) - BigInt(1);

export function convertDisplayAmountToProofAmount(displayAmount: string, label = 'Amount') {
  const normalized = displayAmount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`${label} is not a valid decimal value.`);
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');

  if (fractionPart.length > AGENT_TOKEN_DECIMALS) {
    throw new Error(`${label} uses too many decimals.`);
  }

  const whole = BigInt(wholePart || '0') * BigInt(10) ** BigInt(AGENT_TOKEN_DECIMALS);
  const fraction = BigInt(fractionPart.padEnd(AGENT_TOKEN_DECIMALS, '0') || '0');
  const amount = whole + fraction;

  if (amount <= BigInt(0)) {
    throw new Error(`${label} must be greater than zero.`);
  }

  if (amount > MAX_PROOF_AMOUNT) {
    throw new Error(`${label} is too large for the proving circuit.`);
  }

  return amount;
}

export function convertProofAmountToErc20Amount(proofAmount: bigint) {
  return proofAmount * ERC20_TRANSFER_SCALE;
}
