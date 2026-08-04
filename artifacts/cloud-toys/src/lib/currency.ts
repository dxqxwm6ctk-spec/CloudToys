/** 1 USD = 0.709 JOD (Jordanian Dinar fixed peg) */
const USD_TO_JOD = 0.709;

export function formatUSD(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatJOD(usdAmount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(usdAmount * USD_TO_JOD);
}
