import { Link } from 'wouter';
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency || 'USD' }).format(price);

  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      {/* Image Container */}
      <div
        className="relative overflow-hidden rounded-[20px] bg-[#F8F6F3] mb-4"
        style={{ aspectRatio: '3/4', boxShadow: hovered ? '0 20px 60px rgba(122,31,61,0.12)' : '0 4px 24px rgba(0,0,0,0.06)', transition: 'box-shadow 0.4s ease' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ProductPicture
          src={product.mediumUrl ?? product.imageUrl}
          avifSrcSet={
            product.thumbUrl && product.mediumUrl && product.largeUrl
              ? `${product.thumbUrl} 300w, ${product.mediumUrl} 800w, ${product.largeUrl} 1600w`
              : undefined
          }
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center"
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
            <span className="bg-[#7A1F3D] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest">New</span>
          )}
          {product.badge === 'sale' && discountPct && (
            <span className="bg-[#C9A227] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest">−{discountPct}%</span>
          )}
          {product.badge === 'bestseller' && (
            <span className="bg-white/90 text-[#7A1F3D] text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest border border-[#7A1F3D]/20">Best Seller</span>
          )}
        </div>

        {/* Wishlist button — always visible on mobile, hover on desktop */}
        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-md transition-all duration-200 hover:scale-110 ${isWishlisted ? 'text-[#7A1F3D]' : 'text-gray-400 hover:text-[#7A1F3D]'} md:opacity-0 md:group-hover:opacity-100`}
          aria-label="Wishlist"
        >
          <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        {/* Hover Actions */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-x-3 bottom-3 flex gap-2"
            >
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 bg-white text-[#7A1F3D] h-10 rounded-full text-sm font-semibold hover:bg-[#7A1F3D] hover:text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                {product.inStock ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <Link
                href={`/product/${product.id}`}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-[#7A1F3D] shadow-lg transition-colors flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="px-1 space-y-1.5">
        <p className="text-[10px] text-[#C9A227] font-semibold uppercase tracking-[0.15em]">{product.categoryName}</p>
        <h3 className="font-serif text-[15px] font-medium text-gray-900 group-hover:text-[#7A1F3D] transition-colors duration-200 line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[15px] font-semibold text-gray-900">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
