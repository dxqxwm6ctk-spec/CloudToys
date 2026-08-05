import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, LogIn } from 'lucide-react';
import { Link } from 'wouter';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { CopyOrderNumber } from '../components/ui/CopyOrderNumber';
import { getApiBase } from '../lib/api-url';

import { formatJOD } from '../lib/currency';

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

function OrderRow({ order }: { order: MyOrderEntry }) {
  // Live status from the server — falls back to the stored status while
  // loading (kept in sync in case an admin update landed since the list load).
  const { data: tracking, isLoading } = useTrackOrder(order.orderNumber, {
    query: { queryKey: ['trackOrder', order.orderNumber] },
  });

  const statusLabel = isLoading ? order.status : (tracking?.status ?? order.status);

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
        <CopyOrderNumber orderNumber={order.orderNumber} />
        <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground capitalize whitespace-nowrap">
          {statusLabel.replace(/_/g, ' ')}
        </span>
        <Link href={`/track-order?number=${order.orderNumber}`}>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export function MyOrders() {
  const { user, isLoading: authLoading, getAccessToken, signInWithGoogle } = useCustomerAuth();

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
              <OrderRow key={order.orderNumber} order={order} />
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
