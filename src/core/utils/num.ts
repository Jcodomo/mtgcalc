// Number helpers shared by every calculation.
// Rounding convention: money is rounded half away from zero to the cent with `round(x, 2)`; the tiny EPSILON nudge
// keeps values like 1.005 from rounding down because of binary floating point.

/** Reads a number from a number or a typed string ("$1,250.50", "6.5%"); anything else gives `fallback`. */
export function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,%\s,]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return fallback;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** `num`, with negatives treated as 0. */
export function nonNegative(value: unknown): number {
  const n = num(value);
  return n < 0 ? 0 : n;
}

export function clamp(value: unknown, min: number, max: number): number {
  const n = num(value);
  return n < min ? min : n > max ? max : n;
}

/** Rounds half away from zero to `digits` decimal places. */
export function round(value: unknown, digits = 2): number {
  const n = num(value), factor = Math.pow(10, digits);
  return Math.sign(n) * Math.round(Math.abs(n) * factor + Number.EPSILON) / factor;
}

/** Rounds down to a multiple of `increment` (no rounding when the increment is 0 or less). */
export function roundDownTo(value: unknown, increment: unknown): number {
  const step = num(increment);
  return step <= 0 ? num(value) : Math.floor(num(value) / step) * step;
}

/** Rounds up to a multiple of `increment` (no rounding when the increment is 0 or less). */
export function roundUpTo(value: unknown, increment: unknown): number {
  const step = num(increment);
  return step <= 0 ? num(value) : Math.ceil(num(value) / step) * step;
}

/** `numerator / denominator`, or `fallback` when the denominator is 0. */
export function safeDivide(numerator: unknown, denominator: unknown, fallback = 0): number {
  const d = num(denominator);
  return d === 0 ? fallback : num(numerator) / d;
}

export function sum(...values: unknown[]): number {
  return values.reduce<number>((total, v) => total + num(v), 0);
}

export function currency(value: unknown, digits = 0): string {
  const n = num(value), body = Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  return `${n < 0 ? '-' : ''}$${body}`;
}

export function percent(value: unknown, digits = 3): string {
  return `${(100 * num(value)).toFixed(digits).replace(/\.?0+$/, '')}%`;
}

export default {num, nonNegative, clamp, round, roundDownTo, roundUpTo, safeDivide, sum, currency, percent};
