/**
 * Rounds a number to exactly 2 decimal places using standard 0.5-up rounding.
 */
const r2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Forward: taxable value → line total (with tax).
 */
export const calculateFromTaxable = (taxableValue, taxRate) => {
  const base = parseFloat(taxableValue) || 0;
  const rate = parseFloat(taxRate)      || 0;
  return r2(base * (1 + rate / 100));
};

/**
 * Reverse: line total (with tax) → taxable value.
 * Used when the user types into the "Total" column directly.
 */
export const calculateFromTotal = (totalValue, taxRate) => {
  const total = parseFloat(totalValue) || 0;
  const rate  = parseFloat(taxRate)    || 0;
  return r2(total / (1 + rate / 100));
};