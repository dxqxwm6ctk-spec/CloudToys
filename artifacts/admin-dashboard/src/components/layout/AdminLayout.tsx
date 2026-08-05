import React from 'react';
import { Link, useLocation } from 'wouter';
import { Package, LayoutDashboard, FolderTree, ShoppingBag, Settings, Truck, Contact, LogOut, MapPin, Mail, PackageCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/categories', label: 'Categories', icon: FolderTree },
    { href: '/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/newsletter', label: 'Newsletter', icon: Mail },
    { href: '/settings/payment-methods', label: 'Payment Methods', icon: Settings },
    { href: '/settings/delivery', label: 'Delivery', icon: Truck },
    { href: '/settings/shipping-zones', label: 'Shipping Zones', icon: MapPin },
    { href: '/settings/shipping-threshold', label: 'Free Shipping', icon: PackageCheck },
    { href: '/settings/returns', label: 'Return Policy', icon: Package },
    { href: '/settings/warranty', label: 'Warranty', icon: ShieldCheck },
    { href: '/settings/contact', label: 'Contact Info', icon: Contact },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-lg">C</span>
          </div>
          <span className="font-serif text-xl font-bold text-foreground">Cloud Toys</span>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="font-medium text-muted-foreground text-sm">
            Admin Console
          </div>
          <div className="flex items-center gap-4">
            {/* Currency toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden text-xs font-medium">
              <button
                onClick={() => setMode('USD')}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  mode === 'USD'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                USD
              </button>
              <button
                onClick={() => setMode('JOD')}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  mode === 'JOD'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                JOD
              </button>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {username ? username.charAt(0).toUpperCase() : '?'}
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
