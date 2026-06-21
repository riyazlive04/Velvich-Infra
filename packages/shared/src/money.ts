/**
 * Money is ALWAYS stored as an integer number of paise (1 rupee = 100 paise).
 * Never use floats for money. These helpers convert at the UI boundary only.
 *
 * In the DB layer paise are stored in BigInt columns; at the JSON/API boundary
 * we represent paise as a JS `number` (safe for amounts up to ~₹90,000 crore).
 */

export const PAISE_PER_RUPEE = 100;

/** Parse a user-entered rupee string/number into integer paise. */
export function rupeesToPaise(rupees: number | string): number {
  const value = typeof rupees === 'string' ? Number(rupees.replace(/[₹,\s]/g, '')) : rupees;
  if (!Number.isFinite(value)) throw new Error(`Invalid rupee amount: ${rupees}`);
  return Math.round(value * PAISE_PER_RUPEE);
}

/** Convert integer paise to a rupee number (may have decimals). */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Format integer paise as Indian-locale currency, e.g. ₹4,50,000.00.
 * `compact` renders lakh/crore where natural, e.g. ₹4.5L, ₹1.2Cr.
 */
export function formatINR(
  paise: number,
  opts: { compact?: boolean; withSymbol?: boolean } = {},
): string {
  const { compact = false, withSymbol = true } = opts;
  const rupees = paiseToRupees(paise);
  const symbol = withSymbol ? '₹' : '';

  if (compact) {
    const abs = Math.abs(rupees);
    const sign = rupees < 0 ? '-' : '';
    if (abs >= 1_00_00_000) return `${sign}${symbol}${(abs / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `${sign}${symbol}${(abs / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${symbol}${abs.toFixed(0)}`;
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `${symbol}${formatted}`;
}

/** Safe sum of paise values. */
export function sumPaise(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Collection percentage: received / contract, clamped to [0, ∞) and rounded
 * to one decimal. Returns null when there is no contract amount to divide by.
 */
export function collectionPercent(receivedPaise: number, contractPaise: number | null): number | null {
  if (!contractPaise || contractPaise <= 0) return null;
  return Math.round((receivedPaise / contractPaise) * 1000) / 10;
}
