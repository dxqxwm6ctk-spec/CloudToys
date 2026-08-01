import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useParams } from 'wouter';

import { AdminLayout } from '@/components/layout/AdminLayout';
import Dashboard from '@/pages/dashboard';
import ProductsList from '@/pages/products/list';
import ProductForm from '@/pages/products/form';
import CategoriesList from '@/pages/categories/list';
import OrdersList from '@/pages/orders/list';
import PaymentMethodsSettings from '@/pages/settings/payment-methods';

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
        <Route path="/settings/payment-methods" component={PaymentMethodsSettings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
