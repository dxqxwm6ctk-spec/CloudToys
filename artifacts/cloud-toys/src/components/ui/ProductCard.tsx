import { Link, useLocation } from 'wouter';
import { formatPrice as formatCurrency } from '../../lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@workspace/api-client-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '@/hooks/use-toast';
import { ProductPicture } from './ProductPicture';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [hovered, setHovered] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast({ title: "Added to cart", description: `${product.name} has been added to your cart.` });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
      toast({ title: "Saved to wishlist", description: `${product.name} saved.` });
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    // Keep the image itself a reliable single-click target. The hover action
    // layer is visual only except for its Add to Bag button.
    if ((e.target as HTMLElement).closest('button')) return;
    setLocation(`/product/${product.slug}`);
  };

  const formatPrice = (price: number) => formatCurrency(price, product.currency);

  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      {/* Image Container */}
      <div
        className="relative mb-2.5 aspect-square overflow-hidden rounded-[16px] bg-[#F8F6F3] shadow-[0_3px_18px_rgba(0,0,0,0.05)] transition-shadow duration-300 sm:mb-4 sm:aspect-[3/4] sm:rounded-[20px] sm:shadow-none"
        style={{ boxShadow: hovered ? '0 20px 60px rgba(122,31,61,0.12)' : undefined }}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
        onClick={handleImageClick}
      >
        <ProductPicture
          src={product.mediumUrl ?? product.imageUrl}
          avifSrcSet={
            product.thumbUrl && product.mediumUrl && product.largeUrl
              ? `${product.thumbUrl} 300w, ${product.mediumUrl} 800w, ${product.largeUrl} 1600w`
              : undefined
          }
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          alt={product.imageAlt ?? product.name}
          lqip={product.lqip}
          loading="lazy"
          className="h-full w-full object-contain object-center p-1.5 sm:p-0"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.badge === 'new' && (
            <span className="bg-[#7A1F3D] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest sm:text-[10px] sm:px-2.5 sm:py-1">New</span>
          )}
          {product.badge === 'sale' && discountPct && (
            <span className="bg-[#C9A227] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest sm:text-[10px] sm:px-2.5 sm:py-1">−{discountPct}%</span>
          )}
          {product.badge === 'bestseller' && (
            <span className="bg-white/90 text-[#7A1F3D] text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#7A1F3D]/20 sm:text-[10px] sm:px-2.5 sm:py-1">Best Seller</span>
          )}
        </div>

        {/* Wishlist button — always visible on mobile, hover on desktop */}
        <button
          onClick={handleWishlist}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all duration-200 hover:scale-110 sm:right-3 sm:top-3 sm:h-9 sm:w-9 ${isWishlisted ? 'text-[#7A1F3D]' : 'text-gray-400 hover:text-[#7A1F3D]'} md:opacity-0 md:group-hover:opacity-100`}
          aria-label="Wishlist"
        >
           <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        {/* Hover Actions */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-x-3 bottom-3 flex gap-2"
            >
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
               className="pointer-events-auto flex-1 bg-white text-[#7A1F3D] h-10 rounded-full text-sm font-semibold hover:bg-[#7A1F3D] hover:text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                {product.inStock ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <span
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-gray-600 shadow-lg flex-shrink-0"
                aria-hidden="true"
              >
                <Eye className="w-4 h-4" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
       <div className="space-y-1 px-0.5 sm:px-1">
         <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[#C9A227] sm:text-[10px] sm:tracking-[0.15em]">{product.categoryName}</p>
         <h3 className="line-clamp-2 font-serif text-[12px] font-medium leading-snug text-gray-900 transition-colors duration-200 group-hover:text-[#7A1F3D] sm:text-[15px]">
          {product.name}
        </h3>
         <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-0.5">
           <span className="text-[13px] font-semibold text-gray-900 sm:text-[15px]">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
             <span className="text-[10px] text-gray-400 line-through sm:text-sm">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
