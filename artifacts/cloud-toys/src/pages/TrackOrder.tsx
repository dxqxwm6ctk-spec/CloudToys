import { useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react';
import { Search, Package, Truck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { CopyOrderNumber } from '../components/ui/CopyOrderNumber';
import { formatJOD } from '../lib/currency';
import { resolveMediaUrl } from '@workspace/api-client-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { getApiBase } from '../lib/api-url';

export function TrackOrder() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialOrder = searchParams.get('number') || '';
  
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrder);
  const [searchOrder, setSearchOrder] = useState(initialOrder);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { user, getAccessToken } = useCustomerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${getApiBase()}/api/orders/${searchOrder}/mine/cancel`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Could not cancel order');
    },
    onSuccess: () => {
      setCancelOpen(false);
      toast({ title: 'Order cancelled' });
      queryClient.invalidateQueries({ queryKey: ['trackOrder', searchOrder] });
    },
    onError: (error: Error) => {
      setCancelOpen(false);
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const { data: tracking, isLoading, error } = useTrackOrder(searchOrder, {
    query: {
      enabled: !!searchOrder,
      queryKey: ['trackOrder', searchOrder]
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumberInput.trim()) {
      setSearchOrder(orderNumberInput.trim());
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('number', orderNumberInput.trim());
      window.history.pushState({}, '', newUrl);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl min-h-[70vh]">
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl font-bold mb-4">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your order number to see the current status of your shipment.</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-16 relative">
          <input
            type="text"
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            placeholder="e.g. ORD-123456"
            className="w-full bg-white border border-border rounded-full px-6 py-4 pr-32 focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-primary text-primary-foreground px-6 rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Track
          </button>
        </form>

        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {error && searchOrder && (
          <div className="bg-destructive/10 text-destructive p-6 rounded-2xl text-center border border-destructive/20">
            <p className="font-medium">We couldn't find an order with that number.</p>
            <p className="text-sm mt-1">Please check the number and try again.</p>
          </div>
        )}

        {tracking && (
          <div className="bg-white border border-border rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Order Number</p>
                <div className="flex items-center gap-1">
                  <h2 className="text-2xl font-serif font-bold">{tracking.orderNumber}</h2>
                  <CopyOrderNumber orderNumber={tracking.orderNumber} />
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Estimated Delivery</p>
                <p className="text-xl font-medium text-primary">{new Date(tracking.estimatedDelivery).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            {user && (tracking.status === 'processing' || tracking.status === 'pending') && (
              <div className="mb-8 flex justify-end">
                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <button type="button" onClick={() => setCancelOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                    <XCircle className="h-4 w-4" /> Cancel order
                  </button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                      <AlertDialogDescription>This is available only while the order is still processing.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancelMutation.isPending}>Keep order</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); cancelMutation.mutate(); }} disabled={cancelMutation.isPending}>
                        {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Cancel order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-secondary md:left-auto md:top-6 md:bottom-auto md:h-0.5 md:w-full md:-z-10"></div>
              
              <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4">
                {tracking.steps.map((step, idx) => (
                  <div key={idx} className="flex md:flex-col items-center gap-6 md:gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                      step.completed 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : idx === tracking.steps.findIndex(s => !s.completed) 
                          ? 'bg-white border-primary text-primary'
                          : 'bg-white border-secondary text-muted-foreground'
                    }`}>
                      {idx === 0 && <Package className="w-5 h-5" />}
                      {idx === 1 && <Truck className="w-5 h-5" />}
                      {idx === 2 && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="md:text-center">
                      <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {step.date && (
                        <p className="text-xs text-muted-foreground mt-1">{new Date(step.date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(tracking.items?.length || tracking.total != null) && (
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  Order Summary
                </h3>
                {tracking.items && tracking.items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {tracking.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="flex items-center gap-3 text-muted-foreground">
                          {item.imageUrl && <img src={resolveMediaUrl(item.imageUrl)} alt="" className="h-10 w-10 rounded-md object-cover" />}
                          {item.name} <span className="text-xs">× {item.quantity}</span>
                        </span>
                        <span>{formatJOD(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatJOD(tracking.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{tracking.shippingFee === 0 ? 'Free' : formatJOD(tracking.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border/60">
                    <span>Total</span>
                    <span>{formatJOD(tracking.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
