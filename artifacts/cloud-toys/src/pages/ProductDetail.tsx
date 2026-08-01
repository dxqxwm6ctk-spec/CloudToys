import { useState } from 'react';
import { useRoute } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useGetProduct } from '@workspace/api-client-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@/hooks/use-toast';
import { Star, Heart, Minus, Plus, ShoppingBag, Truck, Shield, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProductDetail() {
  const [, params] = useRoute('/product/:slug');
  const slug = params?.slug || '';
  
  const { data: product, isLoading, error } = useGetProduct(slug);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary animate-pulse rounded-2xl"></div>
          <div className="space-y-6 py-8">
            <div className="h-8 bg-secondary animate-pulse rounded w-3/4"></div>
            <div className="h-6 bg-secondary animate-pulse rounded w-1/4"></div>
            <div className="h-24 bg-secondary animate-pulse rounded w-full"></div>
            <div className="h-12 bg-secondary animate-pulse rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-serif mb-4">Product not found</h2>
        <p className="text-muted-foreground">The product you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const gallery = [product.imageUrl, ...(product.galleryUrls || [])];

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} added to your cart.`,
    });
  };

  const handleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
      toast({
        title: "Added to wishlist",
        description: `${product.name} has been added to your wishlist.`,
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currency || 'USD',
    }).format(price);
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-secondary rounded-3xl overflow-hidden relative">
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={gallery[activeImage]} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
              {product.badge && (
                <div className="absolute top-6 left-6">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider">
                    {product.badge}
                  </span>
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${activeImage === idx ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <div className="mb-8 border-b border-border pb-8">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">{product.categoryName}</p>
              <h1 className="font-serif text-4xl lg:text-5xl font-semibold mb-4 text-foreground leading-tight">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground underline underline-offset-4 cursor-pointer">{product.reviewCount} Reviews</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-medium text-foreground">{formatPrice(product.price)}</span>
                {product.compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                )}
              </div>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {product.description || product.shortDescription}
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-center gap-6">
                <span className="font-medium">Quantity</span>
                <div className="flex items-center border border-border rounded-full p-1 w-32 bg-white">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="flex-1 bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
                <button
                  onClick={handleWishlist}
                  className={`h-14 px-8 border rounded-full font-medium flex items-center justify-center gap-2 transition-colors ${isWishlisted ? 'border-primary text-primary bg-primary/5' : 'border-border hover:border-foreground'}`}
                >
                  <Heart className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} />
                  {isWishlisted ? 'Saved' : 'Wishlist'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Truck className="w-6 h-6 text-foreground" />
                <span>Free shipping over $150</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <RotateCcw className="w-6 h-6 text-foreground" />
                <span>30-day free returns</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Shield className="w-6 h-6 text-foreground" />
                <span>2-year quality warranty</span>
              </div>
            </div>

          </div>
        </div>

        {/* Features & Details */}
        {product.features && product.features.length > 0 && (
          <div className="mt-24 border-t border-border pt-16">
            <h2 className="font-serif text-3xl font-semibold mb-8">Product Features</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
              {product.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
