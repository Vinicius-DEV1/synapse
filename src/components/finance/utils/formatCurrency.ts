/**
 * Formats a numeric value into standard app currency format.
 * Example: 1500 -> "R$ 1500.00"
 */
export function formatCurrency(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `R$ ${safe.toFixed(2)}`;
}

/**
 * Formats a number with sign (+ or -) and currency.
 * Example: 500 -> "+ R$ 500.00", -500 -> "- R$ 500.00"
 */
export function formatSignedCurrency(amount?: number | null, forceSign: boolean = true): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (safe < 0) {
    return `- R$ ${Math.abs(safe).toFixed(2)}`;
  }
  if (forceSign) {
    return `+ R$ ${safe.toFixed(2)}`;
  }
  return `R$ ${safe.toFixed(2)}`;
}
