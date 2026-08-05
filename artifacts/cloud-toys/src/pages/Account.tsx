import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { User, Package, LogOut, Heart, ChevronRight } from 'lucide-react';
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1-.38-2.27c0-.79.14-1.55.38-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

function RecentOrderRow({ orderNumber, itemCount, total }: { orderNumber: string; itemCount: number; total: number }) {
  const { data: tracking, isLoading } = useTrackOrder(orderNumber, {
    query: { queryKey: ['trackOrder', orderNumber] },
  });
  const statusLabel = isLoading ? 'Loading…' : (tracking?.status ?? 'Placed');

  return (
    <Link
      href={`/track-order?number=${orderNumber}`}
      className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-border hover:border-primary/40 transition-colors group"
    >
      <div>
        <p className="font-semibold font-mono text-sm">{orderNumber}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · {formatJOD(total)}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <CopyOrderNumber orderNumber={orderNumber} />
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground capitalize">{statusLabel}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export function Account() {
  const { user, isLoading, signInWithGoogle, signOut, getAccessToken } = useCustomerAuth();

  const { data: myOrders } = useQuery<MyOrderEntry[]>({
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
  const recentOrders = (myOrders ?? []).slice(0, 3);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Guest';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-24 flex justify-center">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2">My Account</h1>
            <p className="text-muted-foreground mb-8">Sign in to view your profile, orders, and wishlist.</p>
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-2 bg-white border border-border rounded-full px-6 py-3 font-medium hover:bg-secondary/50 transition-colors"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 md:py-24 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-12">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Sidebar */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full mb-4 object-cover" />
              ) : (
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-serif font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="font-serif text-xl font-semibold mb-1">{displayName}</h2>
              <p className="text-sm text-muted-foreground mb-8">{user.email}</p>

              <nav className="space-y-2">
                <Link href="/account" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-sm font-medium text-primary">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link href="/orders" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Package className="w-4 h-4" />
                  Orders
                </Link>
                <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="w-4 h-4" />
                  Wishlist
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="md:col-span-8 lg:col-span-9 space-y-12">
            
            <section>
              <h2 className="text-2xl font-serif font-semibold mb-6">Personal Information</h2>
              <div className="bg-white border border-border rounded-3xl p-8 max-w-2xl">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                    <input type="text" defaultValue={displayName} className="w-full bg-secondary border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <input type="email" defaultValue={user.email ?? ''} disabled className="w-full bg-secondary border-transparent rounded-lg px-4 py-3 outline-none transition-all opacity-60 cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">Managed by your Google account</p>
                  </div>
                  <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">
                    Save Changes
                  </button>
                </form>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold">Recent Orders</h2>
                {recentOrders.length > 0 && (
                  <Link href="/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              {recentOrders.length === 0 ? (
                <div className="bg-white border border-border rounded-3xl p-8 text-center text-muted-foreground py-16">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No recent orders found.</p>
                  <Link href="/shop" className="text-primary hover:underline mt-2 inline-block">Start shopping</Link>
                </div>
              ) : (
                <div className="bg-white border border-border rounded-3xl p-4 space-y-2">
                  {recentOrders.map((order) => (
                    <RecentOrderRow key={order.orderNumber} orderNumber={order.orderNumber} itemCount={order.itemCount} total={order.total} />
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
