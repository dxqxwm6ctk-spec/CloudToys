import * as SecureStore from 'expo-secure-store';

export const ADMIN_TOKEN_KEY = 'cloud_toys_admin_token';

export function getApiOrigin(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

export function apiUrl(path: string): string {
  return `${getApiOrigin()}${path}`;
}

export async function getStoredAdminToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
}

export async function storeAdminToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token);
}

export async function clearStoredAdminToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
}

export async function readApiError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return new Error(payload?.error ?? fallback);
}