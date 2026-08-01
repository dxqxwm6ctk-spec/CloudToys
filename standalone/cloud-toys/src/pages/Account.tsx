import { PageTransition } from '../components/ui/PageTransition';
import { User, Package, Settings, LogOut, Heart } from 'lucide-react';
import { Link } from 'wouter';

export function Account() {
  // Mock user data
  const user = {
    name: "Alex Smith",
    email: "alex@example.com",
    memberSince: "2023"
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 md:py-24 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-12">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Sidebar */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-serif font-bold">
                {user.name.charAt(0)}
              </div>
              <h2 className="font-serif text-xl font-semibold mb-1">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-8">{user.email}</p>

              <nav className="space-y-2">
                <Link href="/account" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-sm font-medium text-primary">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link href="/track-order" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Package className="w-4 h-4" />
                  Orders
                </Link>
                <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="w-4 h-4" />
                  Wishlist
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <input type="text" defaultValue="Alex" className="w-full bg-secondary border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-primary/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <input type="text" defaultValue="Smith" className="w-full bg-secondary border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-primary/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <input type="email" defaultValue={user.email} className="w-full bg-secondary border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-primary/20 outline-none transition-all" />
                  </div>
                  <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">
                    Save Changes
                  </button>
                </form>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-semibold mb-6">Recent Orders</h2>
              <div className="bg-white border border-border rounded-3xl p-8 text-center text-muted-foreground py-16">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No recent orders found.</p>
                <Link href="/shop" className="text-primary hover:underline mt-2 inline-block">Start shopping</Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
