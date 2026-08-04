import { JORDAN_GOVERNORATES } from './jordan-locations';

export interface ParsedShippingAddress {
  address: string;
  governorate: string; // value, e.g. "amman"
  area: string;
}

/**
 * Reverses the "<address>, <area>, <governorate label>" string Checkout
 * writes to orders.shippingAddress, so a returning customer's last order can
 * pre-fill the checkout form. Best-effort: only used to pre-fill fields the
 * customer can still edit, so a parse failure just leaves the form blank
 * rather than blocking checkout.
 */
export function parseShippingAddress(shippingAddress: string): ParsedShippingAddress | null {
  const parts = shippingAddress.split(', ');
  if (parts.length < 3) return null;

  const governorateLabel = parts[parts.length - 1];
  const area = parts[parts.length - 2];
  const address = parts.slice(0, -2).join(', ');

  const governorate = JORDAN_GOVERNORATES.find((g) => g.label === governorateLabel);
  if (!governorate || !address) return null;

  // Area should be one of the governorate's known areas, but don't require
  // an exact match in case the list has since changed — fall back to
  // whatever was stored so the field isn't silently dropped.
  return { address, governorate: governorate.value, area };
}
