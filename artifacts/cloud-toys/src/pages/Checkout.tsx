import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLocation, Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react';

export function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [orderNumber, setOrderNumber] = useState('');

  const shipping = cartTotal >= 150 ? 0 : 15;
  const total = cartTotal + shipping;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderNumber(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
    clearCart();
    setStep(3);
    window.scrollTo(0, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
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
          <div className="bg-secondary/50 p-6 rounded-2xl border border-border w-full mb-10 text-left">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-semibold text-lg">{orderNumber}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've sent a confirmation email to you. You can track the status of your order using the order number above on our tracking page.
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
                    <input required type="email" placeholder="Email address" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  
                  <div className="space-y-4 pt-6">
                    <h3 className="font-medium text-lg">Shipping Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="First name" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input required type="text" placeholder="Last name" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <input required type="text" placeholder="Address" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <input type="text" placeholder="Apartment, suite, etc. (optional)" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="grid grid-cols-3 gap-4">
                      <input required type="text" placeholder="City" className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <select required className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">State</option>
                        <option value="NY">New York</option>
                        <option value="CA">California</option>
                        {/* More states */}
                      </select>
                      <input required type="text" placeholder="ZIP code" className="col-span-1 w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
                    <span>user@example.com</span>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                  </div>
                  <div className="flex justify-between pt-4">
                    <span className="text-muted-foreground">Ship to</span>
                    <span className="text-right truncate max-w-[200px] sm:max-w-xs">123 Design Avenue, Brooklyn NY 11201</span>
                    <button onClick={() => setStep(1)} className="text-primary hover:underline">Change</button>
                  </div>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-white border border-primary rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input type="radio" checked readOnly className="w-4 h-4 text-primary focus:ring-primary" />
                        <span className="font-medium">Credit Card</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-secondary rounded flex items-center justify-center text-[10px] font-bold">VISA</div>
                        <div className="w-8 h-5 bg-secondary rounded flex items-center justify-center text-[10px] font-bold">MC</div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-secondary/10 border border-border rounded-xl space-y-4">
                      <input required type="text" placeholder="Card number" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <div className="grid grid-cols-2 gap-4">
                        <input required type="text" placeholder="Expiration date (MM/YY)" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input required type="text" placeholder="Security code" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <input required type="text" placeholder="Name on card" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button type="submit" className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg hover:bg-primary/90 transition-colors shadow-lg">
                      Pay {formatPrice(total)}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-5">
            <div className="bg-secondary/30 p-8 rounded-3xl sticky top-28 border border-border">
              <h3 className="font-serif text-xl font-semibold mb-6">In your cart</h3>
              
              <div className="space-y-4 mb-6 pb-6 border-b border-border max-h-[40vh] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0 relative border border-border">
                      <img
                        src={item.thumbUrl ?? item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
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
