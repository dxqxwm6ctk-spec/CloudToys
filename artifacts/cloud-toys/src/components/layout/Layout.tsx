import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLocation } from 'wouter';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // The Shop (product browsing) page hides the footer so the newsletter/
  // links block doesn't interrupt scrolling through the product grid.
  const hideFooter = location.startsWith('/shop');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
