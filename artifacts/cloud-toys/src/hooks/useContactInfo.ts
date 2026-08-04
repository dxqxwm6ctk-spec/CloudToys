import { useQuery } from '@tanstack/react-query';
import { getApiBase } from '@/lib/api-url';

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

// Shown briefly while the real values load from the server.
const FALLBACK_CONTACT_INFO: ContactInfo = {
  email: 'hello@cloudtoys.com',
  phone: '+1 (555) 000-1234',
  address: 'San Francisco, CA 94102',
};

async function fetchContactInfo(): Promise<ContactInfo> {
  const res = await fetch(`${getApiBase()}/api/settings/contact`);
  if (!res.ok) throw new Error('Failed to load contact info');
  return res.json();
}

/** Store contact details, editable by admins without a code change. */
export function useContactInfo(): ContactInfo {
  const { data } = useQuery({
    queryKey: ['settings', 'contact'],
    queryFn: fetchContactInfo,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? FALLBACK_CONTACT_INFO;
}
