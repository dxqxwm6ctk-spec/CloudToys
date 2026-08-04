import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

const BASE = getApiBase();

async function fetchDeliverySetting(): Promise<{ days: number }> {
  const res = await fetch(`${BASE}/api/admin/settings/delivery`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updateDeliverySetting(days: number): Promise<{ days: number }> {
  const res = await fetch(`${BASE}/api/admin/settings/delivery`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ days }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to update');
  }
  return res.json();
}

export default function DeliverySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'delivery'],
    queryFn: fetchDeliverySetting,
  });

  useEffect(() => {
    if (data) setDays(String(data.days));
  }, [data]);

  const mutation = useMutation({
    mutationFn: (value: number) => updateDeliverySetting(value),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'delivery'] });
      toast({ title: 'Default delivery time updated', description: `New orders will estimate ${updated.days} day(s).` });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 90) {
      toast({ title: 'Enter a whole number of days between 1 and 90', variant: 'destructive' });
      return;
    }
    mutation.mutate(parsed);
  };

  const isDirty = data && days !== '' && Number(days) !== data.days;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Delivery</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set the default delivery estimate customers see right after checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Default Delivery Window
          </CardTitle>
          <CardDescription>
            New orders are stamped with this many days from the order date as their estimated delivery.
            You can still override the estimate for any individual order from the Orders page.
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
                <Label htmlFor="delivery-days">Days from order date</Label>
                <Input
                  id="delivery-days"
                  type="number"
                  min={1}
                  max={90}
                  className="w-32"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
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
