/**
 * Formats a price using its own currency — no exchange-rate conversion.
 *
 * JOD is the store's base currency (the default), but each product carries
 * its own `currency` field and is always displayed in that currency as
 * entered by the admin, with no conversion math applied.
 */
export function formatPrice(amount: number, currency: string = 'JOD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JOD' ? 3 : 2,
    maximumFractionDigits: currency === 'JOD' ? 3 : 2,
  }).format(amount);
}

/** Cart/checkout totals are always denominated in JOD, the store's base currency. */
export function formatJOD(amount: number): string {
  return formatPrice(amount, 'JOD');
}
