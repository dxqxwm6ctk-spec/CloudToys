import { useQuery } from '@tanstack/react-query';
import { getApiBase } from '@/lib/api-url';

const BASE = getApiBase();

export interface ShippingThreshold {
  amount: number;
  currency: 'JOD' | 'USD';
}

export interface ReturnPolicy {
  enabled: boolean;
  days: number;
}

export interface WarrantyPolicy {
  enabled: boolean;
  duration: number;
  unit: 'months' | 'years';
}

const FALLBACK_SHIPPING: ShippingThreshold = { amount: 150, currency: 'USD' };
const FALLBACK_RETURNS: ReturnPolicy = { enabled: true, days: 30 };
const FALLBACK_WARRANTY: WarrantyPolicy = { enabled: true, duration: 2, unit: 'years' };

/** Admin-configurable free shipping threshold. */
export function useShippingThreshold(): ShippingThreshold {
  const { data } = useQuery<ShippingThreshold>({
    queryKey: ['settings', 'shipping'],
    queryFn: () => fetch(`${BASE}/api/settings/shipping`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? FALLBACK_SHIPPING;
}

/** Admin-configurable return policy — can be disabled entirely. */
export function useReturnPolicy(): ReturnPolicy {
  const { data } = useQuery<ReturnPolicy>({
    queryKey: ['settings', 'returns'],
    queryFn: () => fetch(`${BASE}/api/settings/returns`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? FALLBACK_RETURNS;
}

/** Admin-configurable warranty policy — can be disabled entirely. */
export function useWarrantyPolicy(): WarrantyPolicy {
  const { data } = useQuery<WarrantyPolicy>({
    queryKey: ['settings', 'warranty'],
    queryFn: () => fetch(`${BASE}/api/settings/warranty`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? FALLBACK_WARRANTY;
}
