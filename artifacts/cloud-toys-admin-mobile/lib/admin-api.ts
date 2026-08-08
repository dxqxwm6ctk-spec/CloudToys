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
  days: number;
}

export interface TextSetting {
  value: string;
}

export interface ReturnPolicySetting {
  enabled: boolean;
  days: number;
}

export interface WarrantyPolicySetting {
  enabled: boolean;
  duration: number;
  unit: 'months' | 'years';
}

export interface ContactSetting {
  email: string;
  phone: string;
  address: string;
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

export interface SecurityEvent {
  id: number;
  ip: string;
  method: string;
  path: string;
  reason: string;
  userId: string | null;
  email: string | null;
  createdAt: string;
}

export interface SecuritySummary {
  ip: string;
  count: number;
  lastSeen: string;
  reasons: string[];
}

export interface BlockedIp {
  ip: string;
  reason: string | null;
  createdAt: string;
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

export function getReturnPolicySetting(): Promise<ReturnPolicySetting> {
  return request<ReturnPolicySetting>('/api/admin/settings/returns');
}

export function updateReturnPolicySetting(data: ReturnPolicySetting): Promise<ReturnPolicySetting> {
  return request<ReturnPolicySetting>('/api/admin/settings/returns', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getWarrantyPolicySetting(): Promise<WarrantyPolicySetting> {
  return request<WarrantyPolicySetting>('/api/admin/settings/warranty');
}

export function updateWarrantyPolicySetting(data: WarrantyPolicySetting): Promise<WarrantyPolicySetting> {
  return request<WarrantyPolicySetting>('/api/admin/settings/warranty', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getContactSetting(): Promise<ContactSetting> {
  return request<ContactSetting>('/api/admin/settings/contact');
}

export function updateContactSetting(data: ContactSetting): Promise<ContactSetting> {
  return request<ContactSetting>('/api/admin/settings/contact', {
    method: 'PUT',
    body: JSON.stringify(data),
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

export function listSecurityEvents(): Promise<SecurityEvent[]> {
  return request<SecurityEvent[]>('/api/admin/security/events');
}

export function listSecuritySummary(): Promise<SecuritySummary[]> {
  return request<SecuritySummary[]>('/api/admin/security/summary');
}

export function listBlockedIps(): Promise<BlockedIp[]> {
  return request<BlockedIp[]>('/api/admin/security/blocked-ips');
}

export function blockIp(ip: string, reason?: string): Promise<{ ip: string }> {
  return request<{ ip: string }>('/api/admin/security/blocked-ips', {
    method: 'POST',
    body: JSON.stringify({ ip, reason: reason?.trim() || undefined }),
  });
}

export function unblockIp(ip: string): Promise<void> {
  return request<void>(`/api/admin/security/blocked-ips/${encodeURIComponent(ip)}`, {
    method: 'DELETE',
  });
}