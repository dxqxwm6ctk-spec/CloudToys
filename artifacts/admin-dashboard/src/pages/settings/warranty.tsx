import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

interface WarrantyPolicy {
  enabled: boolean;
  duration: number;
  unit: 'months' | 'years';
}

const BASE = getApiBase();

async function fetchWarrantyPolicy(): Promise<WarrantyPolicy> {
  const res = await fetch(`${BASE}/api/admin/settings/warranty`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updateWarrantyPolicy(data: WarrantyPolicy): Promise<WarrantyPolicy> {
  const res = await fetch(`${BASE}/api/admin/settings/warranty`, {
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

export default function WarrantyPolicySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [duration, setDuration] = useState<string>('');
  const [unit, setUnit] = useState<'months' | 'years'>('years');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'warranty'],
    queryFn: fetchWarrantyPolicy,
  });

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setDuration(String(data.duration));
      setUnit(data.unit);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (value: WarrantyPolicy) => updateWarrantyPolicy(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'warranty'] });
      toast({ title: 'Warranty policy updated' });
    },
    onError: (err) => {
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const parsed = Number(duration);
    if (enabled && (!Number.isInteger(parsed) || parsed < 1 || parsed > 120)) {
      toast({ title: 'Enter a whole number duration between 1 and 120', variant: 'destructive' });
      return;
    }
    mutation.mutate({ enabled, duration: Number.isInteger(parsed) && parsed > 0 ? parsed : 2, unit });
  };

  const isDirty = data && (enabled !== data.enabled || Number(duration) !== data.duration || unit !== data.unit);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Warranty</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control the warranty message shown on product pages, or turn it off entirely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Quality Warranty
          </CardTitle>
          <CardDescription>
            When enabled, product pages show "{'{duration}'}-{'{unit}'} quality warranty". Disable to hide it completely.
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
                <Switch id="warranty-enabled" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="warranty-enabled">Show warranty on storefront</Label>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="warranty-duration">Duration</Label>
                  <Input
                    id="warranty-duration"
                    type="number"
                    min={1}
                    max={120}
                    className="w-28"
                    value={duration}
                    disabled={!enabled}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="warranty-unit">Unit</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as 'months' | 'years')}>
                    <SelectTrigger id="warranty-unit" className="w-28" disabled={!enabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
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
