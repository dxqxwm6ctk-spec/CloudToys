import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronRight, LogIn, Trash2, Loader2, XCircle, Eye } from 'lucide-react';
import { Link } from 'wouter';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { CopyOrderNumber } from '../components/ui/CopyOrderNumber';
import { getApiBase } from '../lib/api-url';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { formatJOD } from '../lib/currency';
import { resolveMediaUrl } from '@workspace/api-client-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const BASE = getApiBase();

interface MyOrderEntry {
  orderNumber: string;
  status: string;
  estimatedDelivery: string;
  placedAt: string | null;
  total: number;
  itemCount: number;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function OrderRow({ order, onRemoved }: { order: MyOrderEntry; onRemoved: () => void }) {
  // Live status from the server — falls back to the stored status while
  // loading (kept in sync in case an admin update landed since the list load).
  const { data: tracking, isLoading } = useTrackOrder(order.orderNumber, {
    query: { queryKey: ['trackOrder', order.orderNumber] },
  });
  const { toast } = useToast();
  const { getAccessToken } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const statusLabel = isLoading ? order.status : (tracking?.status ?? order.status);
  const canCancel = statusLabel === 'processing' || statusLabel === 'pending';

  const removeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${BASE}/api/orders/${order.orderNumber}/mine`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to remove order');
    },
    onSuccess: () => {
      onRemoved();
      toast({ title: 'Order removed from your list' });
    },
    onError: () => {
      toast({ title: 'Could not remove order', variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${BASE}/api/orders/${order.orderNumber}/mine/cancel`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Could not cancel order');
    },
    onSuccess: () => {
      setCancelOpen(false);
      toast({ title: 'Order cancelled', description: 'Your order was cancelled successfully.' });
      queryClient.invalidateQueries({ queryKey: ['trackOrder', order.orderNumber] });
      onRemoved();
    },
    onError: (error: Error) => {
      setCancelOpen(false);
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="flex items-center justify-between gap-4 bg-white border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors group">
      <Link href={`/track-order?number=${order.orderNumber}`} className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-semibold font-mono truncate">{order.orderNumber}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {formatJOD(order.total)}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Details
        </button>
        <CopyOrderNumber orderNumber={order.orderNumber} />
        <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground capitalize whitespace-nowrap">
          {statusLabel.replace(/_/g, ' ')}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              title="Remove order from my list"
              aria-label="Remove order from my list"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this order?</AlertDialogTitle>
              <AlertDialogDescription>
                Order {order.orderNumber} will be removed from your "My Orders" list. This won't cancel it or
                affect your order history with the store — you can still track it by order number.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => removeMutation.mutate()}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {canCancel && (
          <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Cancel
            </button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel order {order.orderNumber}?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can cancel only while the order is still processing. After cancellation, the order will not be prepared or shipped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cancelMutation.isPending}>Keep order</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(event) => { event.preventDefault(); cancelMutation.mutate(); }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Link href={`/track-order?number=${order.orderNumber}`}>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{order.orderNumber}</DialogTitle>
            <DialogDescription>Complete order details</DialogDescription>
          </DialogHeader>
          {tracking ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4">
                <span className="capitalize font-medium">{statusLabel.replace(/_/g, ' ')}</span>
                <span className="text-sm text-muted-foreground">Delivery: {tracking.estimatedDelivery}</span>
              </div>
              <div className="space-y-3">
                {tracking.items?.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" /> : <Package className="m-5 h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatJOD(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatJOD(tracking.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{tracking.shippingFee ? formatJOD(tracking.shippingFee) : 'Free'}</span></div>
                <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><span>Total</span><span>{formatJOD(tracking.total)}</span></div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MyOrders() {
  const { user, isLoading: authLoading, getAccessToken, signInWithGoogle } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<MyOrderEntry[]>({
    queryKey: ['my-orders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${BASE}/api/orders/mine`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load orders');
      return res.json();
    },
  });

  const handleRemoved = () => {
    queryClient.invalidateQueries({ queryKey: ['my-orders', user?.id] });
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl min-h-[60vh]">
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Every order placed with your account, linked to your profile.</p>
        </div>

        {authLoading || (user && isLoading) ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="bg-white border border-border rounded-3xl p-8 text-center text-muted-foreground py-16">
            <LogIn className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="mb-4">Sign in to see the orders linked to your account.</p>
            <button
              onClick={() => signInWithGoogle('/orders')}
              className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white border border-border rounded-3xl p-8 text-center text-muted-foreground py-16">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="mb-2">No orders yet.</p>
            <Link href="/shop" className="text-primary hover:underline">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderRow key={order.orderNumber} order={order} onRemoved={handleRemoved} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center text-sm text-muted-foreground">
          Looking for an order placed under a different account?{' '}
          <Link href="/track-order" className="text-primary hover:underline">Track it by order number</Link>.
        </div>
      </div>
    </PageTransition>
  );
}
