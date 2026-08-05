import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useParams } from 'wouter';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import ProductsList from '@/pages/products/list';
import ProductForm from '@/pages/products/form';
import CategoriesList from '@/pages/categories/list';
import OrdersList from '@/pages/orders/list';
import NewsletterList from '@/pages/newsletter/list';
import PaymentMethodsSettings from '@/pages/settings/payment-methods';
import DeliverySettings from '@/pages/settings/delivery';
import ContactSettings from '@/pages/settings/contact';
import ShippingZonesSettings from '@/pages/settings/shipping-zones';
import ShippingThresholdSettings from '@/pages/settings/shipping-threshold';
import ReturnPolicySettings from '@/pages/settings/returns';
import WarrantyPolicySettings from '@/pages/settings/warranty';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function EditProductRoute() {
  const params = useParams();
  return <ProductForm id={params.id} isEdit />;
}

function Router() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/products" component={ProductsList} />
        <Route path="/products/new">{() => <ProductForm />}</Route>
        <Route path="/products/:id/edit" component={EditProductRoute} />
        <Route path="/categories" component={CategoriesList} />
        <Route path="/orders" component={OrdersList} />
        <Route path="/newsletter" component={NewsletterList} />
        <Route path="/settings/payment-methods" component={PaymentMethodsSettings} />
        <Route path="/settings/delivery" component={DeliverySettings} />
        <Route path="/settings/contact" component={ContactSettings} />
        <Route path="/settings/shipping-zones" component={ShippingZonesSettings} />
        <Route path="/settings/shipping-threshold" component={ShippingThresholdSettings} />
        <Route path="/settings/returns" component={ReturnPolicySettings} />
        <Route path="/settings/warranty" component={WarrantyPolicySettings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Gate() {
  const { username, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!username) {
    return <Login />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
