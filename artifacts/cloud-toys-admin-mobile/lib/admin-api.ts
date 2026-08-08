import { apiUrl, getStoredAdminToken } from '@/lib/auth';

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  banned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  address: string | null;
  orders: { orderNumber: string; status: string; total: number; createdAt: string | null }[];
}

export interface PaymentMethodSetting {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

export interface ShippingSetting {
  amount: number;
  currency: 'JOD' | 'USD';
}

export interface DeliverySetting {
  estimatedDays: number;
}

export interface TextSetting {
  value: string;
}

export interface ShippingZoneSetting {
  id: string;
  name: string;
  governorates: string[];
  price: number;
  isDefault: boolean;
}

export interface UploadedImage {
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  lqip?: string | null;
  originalFilename?: string;
  uuid?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredAdminToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function listAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>('/api/admin/users');
}

export function getAdminUser(id: string): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/api/admin/users/${id}`);
}

export function banAdminUser(id: string, reason?: string): Promise<void> {
  return request<void>(`/api/admin/users/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
}

export function unbanAdminUser(id: string): Promise<void> {
  return request<void>(`/api/admin/users/${id}/unban`, { method: 'POST' });
}

export function uploadAdminImage(
  image: { uri: string; name?: string; type?: string },
  productId = 'unassigned',
): Promise<UploadedImage> {
  const body = new FormData();
  body.append('productId', productId);
  body.append('file', {
    uri: image.uri,
    name: image.name ?? `cloud-toys-${Date.now()}.jpg`,
    type: image.type ?? 'image/jpeg',
  } as unknown as Blob);
  return request<UploadedImage>('/api/admin/images/upload', { method: 'POST', body });
}

export function getPaymentMethods(): Promise<PaymentMethodSetting[]> {
  return request<PaymentMethodSetting[]>('/api/admin/settings/payment-methods');
}

export function updatePaymentMethod(id: string, enabled: boolean): Promise<PaymentMethodSetting> {
  return request<PaymentMethodSetting>(`/api/admin/settings/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

export function getShippingSetting(): Promise<ShippingSetting> {
  return request<ShippingSetting>('/api/admin/settings/shipping');
}

export function updateShippingSetting(data: ShippingSetting): Promise<ShippingSetting> {
  return request<ShippingSetting>('/api/admin/settings/shipping', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getDeliverySetting(): Promise<DeliverySetting> {
  return request<DeliverySetting>('/api/admin/settings/delivery');
}

export function updateDeliverySetting(data: DeliverySetting): Promise<DeliverySetting> {
  return request<DeliverySetting>('/api/admin/settings/delivery', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getTextSetting(
  setting: 'returns' | 'warranty' | 'contact',
): Promise<TextSetting> {
  return request<TextSetting>(`/api/admin/settings/${setting}`);
}

export function updateTextSetting(
  setting: 'returns' | 'warranty' | 'contact',
  value: string,
): Promise<TextSetting> {
  return request<TextSetting>(`/api/admin/settings/${setting}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export function listShippingZones(): Promise<ShippingZoneSetting[]> {
  return request<ShippingZoneSetting[]>('/api/admin/settings/shipping-zones');
}

export function createShippingZone(
  data: Omit<ShippingZoneSetting, 'id'>,
): Promise<ShippingZoneSetting> {
  return request<ShippingZoneSetting>('/api/admin/settings/shipping-zones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateShippingZone(
  id: string,
  data: Partial<Omit<ShippingZoneSetting, 'id'>>,
): Promise<ShippingZoneSetting> {
  return request<ShippingZoneSetting>(`/api/admin/settings/shipping-zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteShippingZone(id: string): Promise<void> {
  return request<void>(`/api/admin/settings/shipping-zones/${id}`, { method: 'DELETE' });
}