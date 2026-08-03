/**
 * Local order history — remembers order numbers placed from this browser so
 * the storefront can show a "My Orders" list without requiring customer
 * accounts/login. Mirrors the localStorage pattern already used for the
 * cart and wishlist (see CartContext / WishlistContext).
 */

const STORAGE_KEY = 'cloud-toys-orders';

export interface OrderHistoryEntry {
  orderNumber: string;
  estimatedDelivery: string;
  placedAt: string; // ISO timestamp
  total: number;
  itemCount: number;
}

export function getOrderHistory(): OrderHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addOrderToHistory(entry: OrderHistoryEntry): void {
  try {
    const existing = getOrderHistory().filter((o) => o.orderNumber !== entry.orderNumber);
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — order still
    // succeeded server-side, the customer can look it up via Track Order.
  }
}
