import { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLocation, Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { CheckCircle2, ChevronRight, Lock, CreditCard, Banknote, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '@workspace/api-client-react';
import { addOrderToHistory } from '../lib/orderHistory';
import { formatJOD } from '../lib/currency';
import { CopyOrderNumber } from '../components/ui/CopyOrderNumber';
import { useShippingThreshold } from '../hooks/useStoreSettings';
import { JORDAN_GOVERNORATES } from '../lib/jordan-locations';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import {
  savePendingOrder,
  getPendingOrder,
  clearPendingOrder,
  type PendingOrder,
} from '../lib/pendingOrder';
import { parseShippingAddress } from '../lib/parseShippingAddress';
import { isValidJordanPhone, normalizePhoneInput } from '../lib/phone';

import { getApiBase } from '../lib/api-url';
const BASE = getApiBase();

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1-.38-2.27c0-.79.14-1.55.38-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

interface PaymentMethod {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

export function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const { user, isLoading: authLoading, signInWithGoogle, getAccessToken } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [orderNumber, setOrderNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const hasResumedRef = useRef(false);
  const hasPrefilledRef = useRef(false);

  // Shipping form state
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = isValidJordanPhone(phone);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [area, setArea] = useState('');

  const areaOptions = (JORDAN_GOVERNORATES.find(g => g.value === governorate)?.areas ?? [])
    .map(a => ({ value: a, label: a }));
  const governorateLabel = JORDAN_GOVERNORATES.find(g => g.value === governorate)?.label ?? '';

  // Payment
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loadingMethods, setLoadingMethods] = useState(false);

  // Dynamic shipping price based on the selected location. Keep it `null`
  // until the customer chooses an area, so shipping is never added before
  // the complete delivery location is entered.
  const [shippingPrice, setShippingPrice] = useState<number | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    if (!governorate || !area) {
      setShippingPrice(null);
      setLoadingShipping(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoadingShipping(true);
    setShippingPrice(null);
    fetch(`${BASE}/api/shipping/lookup?governorate=${encodeURIComponent(governorate)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Shipping lookup failed');
        return r.json();
      })
      .then((data: { price: number | null }) => {
        if (!cancelled) setShippingPrice(data.price);
      })
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setShippingPrice(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingShipping(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [governorate, area]);

  const { amount: freeShippingThreshold } = useShippingThreshold();
  const isFreeShipping = cartTotal >= freeShippingThreshold;
  // `null` means "not known yet" (the area is not selected, or the lookup is
  // still loading). Keep it distinct from 0 (genuinely free).
  const shipping = !area ? null : isFreeShipping ? 0 : shippingPrice;
  const shippingKnown = Boolean(area) && (isFreeShipping || (shippingPrice !== null && !loadingShipping));
  const total = cartTotal + (shipping ?? 0);

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
    setPhoneTouched(true);
    if (!governorate || !area || !phoneValid) return;
    setStep(2);
    window.scrollTo(0, 0);
  };

  /** Restore checkout form fields from a saved pending order (used when
   *  resuming after a "Sign in with Google" redirect). */
  const restoreFormFromPendingOrder = (pending: PendingOrder) => {
    setPhone(pending.form.phone);
    setFirstName(pending.form.firstName);
    setLastName(pending.form.lastName);
    setAddress(pending.form.address);
    setGovernorate(pending.form.governorate);
    setArea(pending.form.area);
    setSelectedPayment(pending.form.selectedPayment);
    setStep(2);
  };

  const submitOrder = async (order: PendingOrder, itemCount: number, orderTotal: number) => {
    setIsPlacingOrder(true);
    setOrderError('');
    try {
      const token = await getAccessToken();
      if (!token) {
        // Session didn't come back with the redirect (expired, blocked
        // popup, etc.) — ask the customer to sign in again.
        throw new Error('Please sign in to place your order.');
      }
      const res = await fetch(`${BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          paymentMethodKey: order.paymentMethodKey,
          shippingAddress: order.shippingAddress,
          governorate: order.governorate,
          items: order.items,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to place order');
      }
      const data = await res.json() as { orderNumber: string; estimatedDelivery: string };
      setOrderNumber(data.orderNumber);
      setEstimatedDelivery(data.estimatedDelivery);
      addOrderToHistory({
        orderNumber: data.orderNumber,
        estimatedDelivery: data.estimatedDelivery,
        placedAt: new Date().toISOString(),
        total: orderTotal,
        itemCount,
      });
      clearPendingOrder();
      clearCart();
      setStep(3);
      window.scrollTo(0, 0);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Resume a checkout that was interrupted by the "Sign in with Google"
  // redirect: once the customer is back and authenticated, submit the saved
  // order automatically instead of making them fill the form out again.
  useEffect(() => {
    if (authLoading || hasResumedRef.current) return;
    const pending = getPendingOrder();
    if (!pending) return;
    if (!user) return; // still not signed in — leave the pending order saved
    hasResumedRef.current = true;
    restoreFormFromPendingOrder(pending);
    const itemCount = pending.items.reduce((sum, i) => sum + i.quantity, 0);
    const orderTotal = pending.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    void submitOrder(pending, itemCount, orderTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Pre-fill shipping details from the customer's last order so returning,
  // signed-in customers don't have to retype their address. Only runs once,
  // and only when there's no pending order being resumed (that already
  // restores the in-progress form) and the fields are still blank (so it
  // never clobbers something the customer already typed).
  useEffect(() => {
    if (authLoading || !user || hasPrefilledRef.current || getPendingOrder()) return;
    if (firstName || address) return; // already filled in (typed or restored)
    hasPrefilledRef.current = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${BASE}/api/orders/last-shipping`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const last = await res.json() as {
          customerName: string | null;
          customerPhone: string | null;
          shippingAddress: string | null;
        } | null;
        if (!last) return;

        if (last.customerName) {
          const [first, ...rest] = last.customerName.trim().split(' ');
          setFirstName(first ?? '');
          setLastName(rest.join(' '));
        }
        if (last.customerPhone) setPhone(last.customerPhone);
        if (last.shippingAddress) {
          const parsed = parseShippingAddress(last.shippingAddress);
          if (parsed) {
            setAddress(parsed.address);
            setGovernorate(parsed.governorate);
            setArea(parsed.area);
          }
        }
      } catch {
        // Best-effort pre-fill — leave the form blank on any failure.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const buildOrderPayload = (): PendingOrder => ({
    customerName: `${firstName} ${lastName}`.trim(),
    customerPhone: normalizePhoneInput(phone),
    paymentMethodKey: selectedPayment,
    shippingAddress: `${address}, ${area}, ${governorateLabel}`.trim(),
    governorate,
    shippingFee: shipping ?? 0,
    items: items.map(i => ({
      productId: String(i.id),
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
    form: { phone, firstName, lastName, address, governorate, area, selectedPayment },
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    const order = buildOrderPayload();

    if (!user) {
      // Not signed in — save the order exactly as filled out, then send the
      // customer to Google sign-in. They're brought straight back to
      // /checkout and the order is submitted automatically (see the resume
      // effect above), so nothing needs to be re-entered.
      savePendingOrder(order);
      setIsSigningIn(true);
      setOrderError('');
      try {
        await signInWithGoogle('/checkout');
      } catch {
        setIsSigningIn(false);
        setOrderError('Could not start sign-in. Please try again.');
      }
      return;
    }

    await submitOrder(order, items.reduce((sum, i) => sum + i.quantity, 0), total);
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
              <span className="flex items-center gap-1">
                <span className="font-semibold text-lg font-mono">{orderNumber}</span>
                <CopyOrderNumber orderNumber={orderNumber} />
              </span>
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
                    <div>
                      <input
                        required
                        type="tel"
                        inputMode="tel"
                        placeholder="Phone number (07XXXXXXXX)"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        dir="ltr"
                        className={`w-full bg-white border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 ${
                          phoneTouched && !phoneValid
                            ? 'border-destructive focus:ring-destructive/20'
                            : 'border-border focus:ring-primary/20'
                        }`}
                      />
                      {phoneTouched && !phoneValid && (
                        <p className="text-xs text-destructive mt-1.5">
                          Enter a valid Jordanian mobile number, e.g. 0791234567
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4 pt-6">
                    <h3 className="font-medium text-lg">Shipping Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input required type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <input required type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="grid grid-cols-2 gap-4">
                      <SearchableSelect
                        value={governorate}
                        onChange={(val) => { setGovernorate(val); setArea(''); }}
                        options={JORDAN_GOVERNORATES.map(g => ({ value: g.value, label: g.label }))}
                        placeholder="المحافظة"
                        searchPlaceholder="ابحث عن محافظة..."
                        emptyText="لم يتم العثور على محافظة"
                      />
                      <SearchableSelect
                        value={area}
                        onChange={setArea}
                        options={areaOptions}
                        placeholder={governorate ? 'المنطقة' : 'اختر المحافظة أولاً'}
                        searchPlaceholder="ابحث عن منطقة..."
                        emptyText="لم يتم العثور على منطقة"
                        disabled={!governorate}
                      />
                    </div>
                  </div>
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={!governorate || !area || !phoneValid}
                      className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
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
                    <span dir="ltr">{phone}</span>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                  </div>
                  <div className="flex justify-between pt-4">
                    <span className="text-muted-foreground">Ship to</span>
                    <span className="text-right truncate max-w-[200px] sm:max-w-xs">{address}, {area}, {governorateLabel}</span>
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

                  {!authLoading && !user && (
                    <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                      Sign in with Google to place your order — your shipping and payment details are already saved, so you won't need to re-enter anything.
                    </p>
                  )}

                  {orderError && (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{orderError}</p>
                  )}

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isPlacingOrder || isSigningIn || paymentMethods.length === 0}
                      className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg hover:bg-primary/90 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {(isPlacingOrder || isSigningIn) && <Loader2 className="w-5 h-5 animate-spin" />}
                      {!authLoading && !user && !isSigningIn && <GoogleIcon />}
                      {isSigningIn
                        ? 'Redirecting to Google…'
                        : isPlacingOrder
                          ? 'Placing Order…'
                          : !authLoading && !user
                            ? 'Sign in with Google to Order'
                            : selectedPayment === 'cash_on_delivery'
                              ? 'Confirm Order'
                              : `Pay ${formatJOD(total)}`}
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
                      <img src={resolveMediaUrl(item.thumbUrl ?? item.imageUrl)} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-muted text-muted-foreground rounded-full text-[10px] flex items-center justify-center font-bold border border-border">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-sm font-medium line-clamp-1">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{formatJOD(item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 text-sm mb-6 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatJOD(cartTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Shipping</span>
                  {loadingShipping ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : !shippingKnown ? (
                    <span className="text-sm text-muted-foreground italic">Select your area</span>
                  ) : (
                    <span className="font-medium">{shipping === 0 ? 'Free' : formatJOD(shipping as number)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-lg font-medium">Total</span>
                <div className="text-right">
                  <div className="text-3xl font-serif font-semibold">{formatJOD(total)}</div>
                  {!shippingKnown && (
                    <div className="text-xs text-muted-foreground mt-1">+ shipping, based on your area</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
