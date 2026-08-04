/**
 * Persists an in-progress checkout across the full-page redirect that
 * "Sign in with Google" requires, so a customer who isn't logged in yet
 * doesn't have to re-enter their shipping/payment details after signing in —
 * the order is submitted automatically as soon as they return authenticated.
 */

const STORAGE_KEY = 'cloud-toys-pending-order';

export interface PendingOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PendingOrder {
  customerName: string;
  customerPhone: string;
  paymentMethodKey: string;
  shippingAddress: string;
  items: PendingOrderItem[];
  // Form fields needed to redisplay the checkout page if auto-submit fails
  // (e.g. an item went out of stock while the customer was signing in).
  form: {
    phone: string;
    firstName: string;
    lastName: string;
    address: string;
    governorate: string;
    area: string;
    selectedPayment: string;
  };
}

export function savePendingOrder(order: PendingOrder): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Storage unavailable — the customer will just need to re-enter details
    // after signing in, same as before this feature existed.
  }
}

export function getPendingOrder(): PendingOrder | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as PendingOrder) : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
