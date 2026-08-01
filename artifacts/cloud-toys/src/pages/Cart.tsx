import { useCart } from '../context/CartContext';
import { PageTransition } from '../components/ui/PageTransition';
import { Link, useLocation } from 'wouter';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function Cart() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const [shipping] = useState(15.00);
  const freeShippingThreshold = 150;

  const isFreeShipping = cartTotal >= freeShippingThreshold;
  const currentShipping = isFreeShipping ? 0 : shipping;
  const total = cartTotal + currentShipping;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - cartTotal);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-32 text-center max-w-lg">
          <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBagIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link 
            href="/shop" 
            className="inline-flex bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bg-secondary/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="font-serif text-3xl font-bold">Shopping Cart</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Free Shipping Progress */}
            <div className="bg-secondary/50 p-6 rounded-2xl border border-border">
              {isFreeShipping ? (
                <p className="text-sm font-medium text-primary mb-2">You've unlocked free shipping!</p>
              ) : (
                <p className="text-sm font-medium mb-2">You're {formatPrice(amountToFreeShipping)} away from free shipping.</p>
              )}
              <div className="w-full bg-white border border-border rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (cartTotal / freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-border border-t border-border">
              {items.map((item) => (
                <div key={item.id} className="py-8 flex gap-6 sm:gap-8">
                  <Link href={`/product/${item.id}`} className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                    <img
                      src={item.thumbUrl ?? item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.categoryName}</p>
                        <Link href={`/product/${item.id}`} className="font-serif text-lg font-medium hover:text-primary transition-colors line-clamp-2">
                          {item.name}
                        </Link>
                      </div>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-border rounded-full p-1 w-28 sm:w-32 bg-secondary/20">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="flex-1 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive flex items-center gap-2 text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-secondary/30 p-8 rounded-3xl sticky top-28 border border-border">
              <h2 className="font-serif text-2xl font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 text-sm mb-6 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{isFreeShipping ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium text-muted-foreground text-xs">Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline mb-8">
                <span className="text-lg font-medium">Total</span>
                <span className="text-3xl font-serif font-semibold">{formatPrice(total)}</span>
              </div>

              <button 
                onClick={() => setLocation('/checkout')}
                className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Secure checkout</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By proceeding to checkout, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

// Icons not imported from lucide-react above
function ShoppingBagIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <line x1="3" x2="21" y1="6" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
