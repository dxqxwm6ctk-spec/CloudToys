import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLocation, Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { CheckCircle2, ChevronRight, Lock, CreditCard, Banknote, Loader2 } from 'lucide-react';

import { getApiBase } from '../lib/api-url';
const BASE = getApiBase();

interface PaymentMethod {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

export function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [orderNumber, setOrderNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Shipping form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Payment
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loadingMethods, setLoadingMethods] = useState(false);

  const shipping = cartTotal >= 150 ? 0 : 15;
  const total = cartTotal + shipping;

  // Load payment methods when entering payment step
  useEffect(() => {
    if (step === 2 && paymentMethods.length === 0) {
      setLoadingMethods(true);
      fetch(`${BASE}/api/orders/payment-methods`)
        .then(r => r.json())
        .then((data: PaymentMethod[]) => {
          const enabled = data.filter(m => m.enabled);
          setPaymentMethods(enabled);
          if (enabled.length > 0) setSelectedPayment(enabled[0].key);
        })
        .catch(() => {})
        .finally(() => setLoadingMethods(false));
    }
  }, [step]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setIsPlacingOrder(true);
    setOrderError('');
    try {
      const res = await fetch(`${BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `${firstName} ${lastName}`.trim(),
          customerEmail: email,
          paymentMethodKey: selectedPayment,
          shippingAddress: `${address}, ${city} ${state} ${zip}`.trim(),
          items: items.map(i => ({
            productId: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to place order');
      }
      const data = await res.json() as { orderNumber: string; estimatedDelivery: string };
      setOrderNumber(data.orderNumber);
      setEstimatedDelivery(data.estimatedDelivery);
      clearCart();
      setStep(3);
      window.scrollTo(0, 0);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  if (step === 3) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-32 text-center max-w-2xl min-h-[70vh] flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-4">Order Confirmed</h1>
          <p className="text-xl text-muted-foreground mb-8">Thank you for your purchase.</p>
          <div className="bg-secondary/50 p-6 rounded-2xl border border-border w-full mb-10 text-left space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-semibold text-lg font-mono">{orderNumber}</span>
            </div>
            {estimatedDelivery && (
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Estimated Delivery</span>
                <span className="font-medium text-primary">{estimatedDelivery}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">
              Track the status of your order using the order number above.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href={`/track-order?number=${orderNumber}`} className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium hover:bg-primary/90 transition-colors">
              Track Order
            </Link>
            <Link href="/shop" className="bg-white border border-border px-8 py-4 rounded-full font-medium hover:border-foreground transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (items.length === 0 && step !== 3) {
    setLocation('/cart');
    return null;
  }

  const methodIcon = (key: string) => {
    if (key === 'credit_card') return <CreditCard className="w-4 h-4" />;
    if (key === 'cash_on_delivery') return <Banknote className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />;
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-12">
          <Link href="/cart" className="hover:text-foreground transition-colors">Cart</Link>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 1 ? "text-foreground font-medium" : ""}>Shipping</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 2 ? "text-foreground font-medium" : ""}>Payment</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          <div className="lg:col-span-7">
            {step === 1 ? (
              <div>
                <h2 className="font-serif text-3xl font-bold mb-8">Shipping Information</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Contact Details</h3>
                    <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-4 pt-6">
                    <h3 className="font-medium text-lg">Shipping Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input required type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <input required type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="grid grid-cols-3 gap-4">
                      <input required type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input required type="text" placeholder="State" value={state} onChange={e => setState(e.target.value)} className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input required type="text" placeholder="ZIP code" value={zip} onChange={e => setZip(e.target.value)} className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="pt-6">
                    <button type="submit" className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg hover:bg-primary/90 transition-colors">
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-serif text-3xl font-bold">Payment</h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Secure</span>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-2xl border border-border p-6 mb-8 text-sm">
                  <div className="flex justify-between pb-4 border-b border-border">
                    <span className="text-muted-foreground">Contact</span>
                    <span>{email}</span>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                  </div>
                  <div className="flex justify-between pt-4">
                    <span className="text-muted-foreground">Ship to</span>
                    <span className="text-right truncate max-w-[200px] sm:max-w-xs">{address}, {city} {state} {zip}</span>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                  </div>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-medium text-base">Payment Method</h3>

                    {loadingMethods ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl">
                        No payment methods are currently available. Please try again later.
                      </p>
                    ) : (
                      paymentMethods.map(method => (
                        <label
                          key={method.key}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                            selectedPayment === method.key
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-white hover:border-primary/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.key}
                            checked={selectedPayment === method.key}
                            onChange={() => setSelectedPayment(method.key)}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <div className="text-primary">{methodIcon(method.key)}</div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{method.label}</p>
                            {method.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                            )}
                          </div>
                        </label>
                      ))
                    )}

                    {/* Card fields only for credit card */}
                    {selectedPayment === 'credit_card' && (
                      <div className="p-4 bg-secondary/10 border border-border rounded-xl space-y-4 mt-2">
                        <input required type="text" placeholder="Card number" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <div className="grid grid-cols-2 gap-4">
                          <input required type="text" placeholder="Expiration (MM/YY)" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input required type="text" placeholder="CVV" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <input required type="text" placeholder="Name on card" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    )}
                  </div>

                  {orderError && (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{orderError}</p>
                  )}

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isPlacingOrder || paymentMethods.length === 0}
                      className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg hover:bg-primary/90 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isPlacingOrder && <Loader2 className="w-5 h-5 animate-spin" />}
                      {isPlacingOrder
                        ? 'Placing Order…'
                        : selectedPayment === 'cash_on_delivery'
                          ? 'Confirm Order'
                          : `Pay ${formatPrice(total)}`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-secondary/30 p-8 rounded-3xl sticky top-28 border border-border">
              <h3 className="font-serif text-xl font-semibold mb-6">In your cart</h3>
              <div className="space-y-4 mb-6 pb-6 border-b border-border max-h-[40vh] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0 relative border border-border">
                      <img src={item.thumbUrl ?? item.imageUrl} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-muted text-muted-foreground rounded-full text-[10px] flex items-center justify-center font-bold border border-border">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-sm font-medium line-clamp-1">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{formatPrice(item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 text-sm mb-6 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-medium">Total</span>
                <span className="text-3xl font-serif font-semibold">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
