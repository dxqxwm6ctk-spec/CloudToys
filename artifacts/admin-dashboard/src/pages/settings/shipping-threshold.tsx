import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PackageCheck, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

interface ShippingThreshold {
  amount: number;
  currency: 'JOD' | 'USD';
}

const BASE = getApiBase();

async function fetchThreshold(): Promise<ShippingThreshold> {
  const res = await fetch(`${BASE}/api/admin/settings/shipping`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updateThreshold(data: ShippingThreshold): Promise<ShippingThreshold> {
  const res = await fetch(`${BASE}/api/admin/settings/shipping`, {
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

export default function ShippingThresholdSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'JOD' | 'USD'>('JOD');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'shipping'],
    queryFn: fetchThreshold,
  });

  useEffect(() => {
    if (data) {
      setAmount(String(data.amount));
      setCurrency(data.currency);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (value: ShippingThreshold) => updateThreshold(value),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'shipping'] });
      toast({ title: 'Free shipping threshold updated', description: `Orders over ${updated.amount} ${updated.currency} now ship free.` });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    mutation.mutate({ amount: parsed, currency });
  };

  const isDirty = data && (amount !== '' && (Number(amount) !== data.amount || currency !== data.currency));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Free Shipping</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set the order amount that qualifies for free shipping in your storefront's cart and checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-primary" />
            Free Shipping Threshold
          </CardTitle>
          <CardDescription>
            Orders with a subtotal at or above this amount ship for free. The currency here is a display label only —
            prices are never converted between currencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shipping-amount">Amount</Label>
                <Input
                  id="shipping-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-36"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipping-currency">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as 'JOD' | 'USD')}>
                  <SelectTrigger id="shipping-currency" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JOD">JOD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
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
