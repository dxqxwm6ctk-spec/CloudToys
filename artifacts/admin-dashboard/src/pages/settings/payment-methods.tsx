import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Banknote, Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

import { getApiBase } from '@/lib/api-url';
const BASE = getApiBase();

async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await fetch(`${BASE}/api/admin/settings/payment-methods`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function updatePaymentMethod(id: string, enabled: boolean): Promise<PaymentMethod> {
  const res = await fetch(`${BASE}/api/admin/settings/payment-methods/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  credit_card: CreditCard,
  cash_on_delivery: Banknote,
};

export default function PaymentMethodsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: methods, isLoading } = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: fetchPaymentMethods,
  });

  const mutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updatePaymentMethod(id, enabled),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
      toast({
        title: updated.enabled ? `${updated.label} enabled` : `${updated.label} disabled`,
      });
    },
    onError: () => {
      toast({ title: 'Failed to update payment method', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Payment Methods</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control which payment options are available to customers at checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Methods</CardTitle>
          <CardDescription>
            Disable a method to hide it from the checkout page immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : methods?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment methods configured.
            </p>
          ) : (
            methods?.map((method) => {
              const Icon = METHOD_ICONS[method.key] ?? CreditCard;
              const isPending = mutation.isPending && mutation.variables?.id === method.id;
              return (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{method.label}</span>
                        <Badge
                          variant="outline"
                          className={method.enabled
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-xs'
                            : 'bg-gray-100 text-gray-500 border-gray-200 text-xs'
                          }
                        >
                          {method.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      {method.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={method.enabled}
                      disabled={isPending}
                      onCheckedChange={(val) => mutation.mutate({ id: method.id, enabled: val })}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
