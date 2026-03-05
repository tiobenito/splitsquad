import type { Cents } from '../types';

/**
 * Convert a dollar amount (user input) to integer cents.
 * Uses Math.round to avoid floating-point accumulation.
 *
 * Examples:
 *   toCents(14.50)  → 1450
 *   toCents(0.01)   → 1
 *   toCents(10)     → 1000
 *   toCents(14.999) → 1500  (rounds correctly)
 */
export function toCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

/**
 * Convert integer cents to a dollar number.
 * Use only at display boundaries — never for arithmetic.
 *
 * Examples:
 *   fromCents(1450) → 14.5
 *   fromCents(1)    → 0.01
 */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

/**
 * Format integer cents as a USD display string.
 * Always shows 2 decimal places.
 *
 * Examples:
 *   formatCurrency(1450) → "$14.50"
 *   formatCurrency(1)    → "$0.01"
 *   formatCurrency(0)    → "$0.00"
 */
export function formatCurrency(cents: Cents): string {
  return `$${(cents / 100).toFixed(2)}`;
}
