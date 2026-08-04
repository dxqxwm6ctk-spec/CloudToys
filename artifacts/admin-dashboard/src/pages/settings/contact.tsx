import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Contact as ContactIcon, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

const BASE = getApiBase();

async function fetchContactInfo(): Promise<ContactInfo> {
  const res = await fetch(`${BASE}/api/admin/settings/contact`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updateContactInfo(data: ContactInfo): Promise<ContactInfo> {
  const res = await fetch(`${BASE}/api/admin/settings/contact`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to update');
  }
  return res.json();
}

export default function ContactSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContactInfo>({ email: '', phone: '', address: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'contact'],
    queryFn: fetchContactInfo,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (value: ContactInfo) => updateContactInfo(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'contact'] });
      toast({ title: 'Contact info updated', description: 'The storefront footer and contact page now show these details.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    },
  });

  const isDirty = data
    ? form.email !== data.email || form.phone !== data.phone || form.address !== data.address
    : false;

  const handleSave = () => {
    if (!form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({ title: 'All fields are required', variant: 'destructive' });
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Contact Info</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Update the email, phone, and address shown in the storefront footer and Contact page — no code changes needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ContactIcon className="w-5 h-5 text-primary" />
            Store Contact Details
          </CardTitle>
          <CardDescription>Changes apply to the live storefront as soon as you save.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-address">Address</Label>
                <Input
                  id="contact-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <Button onClick={handleSave} disabled={!isDirty || mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
