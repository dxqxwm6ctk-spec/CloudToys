import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { Layout } from './components/layout/Layout';

import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Categories } from './pages/Categories';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Wishlist } from './pages/Wishlist';
import { Account } from './pages/Account';
import { TrackOrder } from './pages/TrackOrder';
import { MyOrders } from './pages/MyOrders';
import { Unsubscribe } from './pages/Unsubscribe';

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/categories" component={Categories} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/account" component={Account} />
        <Route path="/orders" component={MyOrders} />
        <Route path="/track-order" component={TrackOrder} />
        <Route path="/unsubscribe" component={Unsubscribe} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <WishlistProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Router />
              </WouterRouter>
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
