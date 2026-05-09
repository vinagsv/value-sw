/**
 * Rounds a number to exactly 2 decimal places using standard 0.5-up rounding.
 * This prevents floating-point drift like 210.009999... showing as 210.01.
 */
const r2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Calculates tax amounts based on taxable value, tax rate, and state type.
 * Each tax component is independently rounded to 2dp so they never drift.
 *
 * @param {number} taxableValue - The base value before tax.
 * @param {number} taxRate - The total tax percentage (e.g., 18).
 * @param {boolean} isInterstate - True if IGST applies, false for CGST/SGST.
 * @returns {{ cgst_amt, sgst_amt, igst_amt, total_tax }} All rounded to 2dp.
 */
export const calculateTaxes = (taxableValue, taxRate, isInterstate) => {
  const value = parseFloat(taxableValue) || 0;
  const rate  = parseFloat(taxRate)      || 0;

  if (isInterstate) {
    const igst = r2((value * rate) / 100);
    return {
      cgst_amt:  0,
      sgst_amt:  0,
      igst_amt:  igst,
      total_tax: igst,
    };
  } else {
    // Calculate each half independently so CGST + SGST always == total_tax exactly.
    // Using half-rate on the base avoids the "split then re-sum" drift.
    const halfRate = rate / 2;
    const cgst = r2((value * halfRate) / 100);
    const sgst = r2((value * halfRate) / 100);
    const total = r2(cgst + sgst); // re-sum the already-rounded halves
    return {
      cgst_amt:  cgst,
      sgst_amt:  sgst,
      igst_amt:  0,
      total_tax: total,
    };
  }
};