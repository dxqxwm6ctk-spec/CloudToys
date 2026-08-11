import type { OrderTrackingStep } from "@workspace/db";

/**
 * Order lifecycle. `pending` is the only status a customer can still edit or
 * cancel — once an admin moves it to `confirmed` the storefront hides the
 * edit/cancel actions automatically (see requireEditableOrder below).
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STEP_LABELS = ["Order Placed", "Confirmed", "Preparing", "Shipped", "Delivered"];

const STATUS_STEP_COUNT: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  preparing: 3,
  shipped: 4,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 0,
};

export function buildSteps(
  current: OrderTrackingStep[],
  newStatus: string,
): OrderTrackingStep[] {
  const completedCount = STATUS_STEP_COUNT[newStatus] ?? 0;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (newStatus === "cancelled") {
    return STEP_LABELS.map((label, idx) => ({
      label,
      completed: false,
      date: current[idx]?.date ?? null,
    }));
  }

  return STEP_LABELS.map((label, idx) => {
    const wasCompleted = current[idx]?.completed ?? false;
    const shouldComplete = idx < completedCount;
    return {
      label,
      completed: shouldComplete,
      date: shouldComplete ? (wasCompleted ? (current[idx]?.date ?? today) : today) : null,
    };
  });
}

/** Only `pending` orders can still be edited or cancelled by the customer. */
export function isCustomerEditable(status: string): boolean {
  return status === "pending";
}

/** Admins can only remove orders/items before shipping or dispatch. */
export function isOrderDeletable(status: string): boolean {
  return !["shipped", "out_for_delivery", "delivered"].includes(status);
}
