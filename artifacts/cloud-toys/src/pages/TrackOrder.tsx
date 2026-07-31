import { useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { useTrackOrder } from '@workspace/api-client-react/src/generated/api';
import { Search, Package, Truck, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'wouter';

export function TrackOrder() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialOrder = searchParams.get('number') || '';
  
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrder);
  const [searchOrder, setSearchOrder] = useState(initialOrder);

  const { data: tracking, isLoading, error } = useTrackOrder(searchOrder, {
    query: {
      enabled: !!searchOrder,
      queryKey: ['trackOrder', searchOrder]
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumberInput.trim()) {
      setSearchOrder(orderNumberInput.trim());
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('number', orderNumberInput.trim());
      window.history.pushState({}, '', newUrl);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl min-h-[70vh]">
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl font-bold mb-4">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your order number to see the current status of your shipment.</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-16 relative">
          <input
            type="text"
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            placeholder="e.g. ORD-123456"
            className="w-full bg-white border border-border rounded-full px-6 py-4 pr-32 focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-primary text-primary-foreground px-6 rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Track
          </button>
        </form>

        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {error && searchOrder && (
          <div className="bg-destructive/10 text-destructive p-6 rounded-2xl text-center border border-destructive/20">
            <p className="font-medium">We couldn't find an order with that number.</p>
            <p className="text-sm mt-1">Please check the number and try again.</p>
          </div>
        )}

        {tracking && (
          <div className="bg-white border border-border rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Order Number</p>
                <h2 className="text-2xl font-serif font-bold">{tracking.orderNumber}</h2>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Estimated Delivery</p>
                <p className="text-xl font-medium text-primary">{new Date(tracking.estimatedDelivery).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-secondary md:left-auto md:top-6 md:bottom-auto md:h-0.5 md:w-full md:-z-10"></div>
              
              <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4">
                {tracking.steps.map((step, idx) => (
                  <div key={idx} className="flex md:flex-col items-center gap-6 md:gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                      step.completed 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : idx === tracking.steps.findIndex(s => !s.completed) 
                          ? 'bg-white border-primary text-primary'
                          : 'bg-white border-secondary text-muted-foreground'
                    }`}>
                      {idx === 0 && <Package className="w-5 h-5" />}
                      {idx === 1 && <Truck className="w-5 h-5" />}
                      {idx === 2 && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="md:text-center">
                      <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {step.date && (
                        <p className="text-xs text-muted-foreground mt-1">{new Date(step.date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
