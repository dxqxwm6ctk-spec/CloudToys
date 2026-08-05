import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Package, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

interface ReturnPolicy {
  enabled: boolean;
  days: number;
}

const BASE = getApiBase();

async function fetchReturnPolicy(): Promise<ReturnPolicy> {
  const res = await fetch(`${BASE}/api/admin/settings/returns`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updateReturnPolicy(data: ReturnPolicy): Promise<ReturnPolicy> {
  const res = await fetch(`${BASE}/api/admin/settings/returns`, {
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

export default function ReturnPolicySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'returns'],
    queryFn: fetchReturnPolicy,
  });

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setDays(String(data.days));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (value: ReturnPolicy) => updateReturnPolicy(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'returns'] });
      toast({ title: 'Return policy updated' });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const parsed = Number(days);
    if (enabled && (!Number.isInteger(parsed) || parsed < 1 || parsed > 365)) {
      toast({ title: 'Enter a whole number of days between 1 and 365', variant: 'destructive' });
      return;
    }
    mutation.mutate({ enabled, days: Number.isInteger(parsed) && parsed > 0 ? parsed : 30 });
  };

  const isDirty = data && (enabled !== data.enabled || Number(days) !== data.days);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Return Policy</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control the returns message shown on product pages, or turn it off entirely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Free Returns
          </CardTitle>
          <CardDescription>
            When enabled, product pages show "{'{days}'}-day free returns". Disable to hide it completely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Switch id="returns-enabled" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="returns-enabled">Show return policy on storefront</Label>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="returns-days">Return window (days)</Label>
                  <Input
                    id="returns-days"
                    type="number"
                    min={1}
                    max={365}
                    className="w-32"
                    value={days}
                    disabled={!enabled}
                    onChange={(e) => setDays(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave} disabled={!isDirty || mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
