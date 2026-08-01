import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import type { Product } from '@workspace/api-client-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '@/hooks/use-toast';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
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
    <Link href={`/product/${product.id}`} className="group block">
      <motion.div 
        className="relative bg-secondary/30 rounded-2xl overflow-hidden aspect-[4/5] mb-4"
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.badge === 'new' && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-wider">New</span>
          )}
          {product.badge === 'sale' && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Sale</span>
          )}
          {product.badge === 'bestseller' && (
            <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Bestseller</span>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-x-4 bottom-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
          <button
            onClick={handleWishlist}
            className={`w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-110 transition-transform ${isWishlisted ? 'text-primary' : 'text-foreground'}`}
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
          
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="flex-1 ml-4 bg-primary text-primary-foreground h-10 rounded-full text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </motion.div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">{product.categoryName}</div>
        <h3 className="font-serif font-medium text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
