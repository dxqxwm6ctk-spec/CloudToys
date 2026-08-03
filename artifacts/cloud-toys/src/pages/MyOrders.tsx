import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react';
import { Package, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { getOrderHistory, type OrderHistoryEntry } from '../lib/orderHistory';

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function OrderRow({ order }: { order: OrderHistoryEntry }) {
  // Live status from the server — falls back to "Placed" while loading or
  // if the order can no longer be found (e.g. cleared from the database).
  const { data: tracking, isLoading } = useTrackOrder(order.orderNumber, {
    query: { queryKey: ['trackOrder', order.orderNumber] },
  });

  const statusLabel = isLoading ? 'Loading…' : (tracking?.status ?? 'Placed');

  return (
    <Link
      href={`/track-order?number=${order.orderNumber}`}
      className="flex items-center justify-between gap-4 bg-white border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold font-mono">{order.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {formatPrice(order.total)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground capitalize">
          {statusLabel}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export function MyOrders() {
  const orders = getOrderHistory();

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl min-h-[60vh]">
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Orders placed from this browser. Tap any order to see full tracking details.</p>
        </div>

        {orders.length === 0 ? (
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
          Placed an order on a different device?{' '}
          <Link href="/track-order" className="text-primary hover:underline">Track it by order number</Link>.
        </div>
      </div>
    </PageTransition>
  );
}
