const WEI_DECIMALS = 18;
const MAX_DISPLAY_DECIMALS = 6;

/**
 * Formats a wei amount (18 decimals) as a human-readable token value,
 * keeping at most 6 decimals and trimming trailing zeros.
 */
export function formatWeiAmount(wei: string | null): string | null {
  if (!wei || !/^\d+$/.test(wei)) {
    return null;
  }

  const value = BigInt(wei);
  const base = BigInt(10) ** BigInt(WEI_DECIMALS);
  const whole = value / base;
  const fraction = (value % base)
    .toString()
    .padStart(WEI_DECIMALS, "0")
    .slice(0, MAX_DISPLAY_DECIMALS)
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** Same as formatWeiAmount but returns a number for chart math. */
export function weiToNumber(wei: string | null): number {
  if (!wei || !/^\d+$/.test(wei)) {
    return 0;
  }

  return Number(BigInt(wei)) / 1e18;
}
