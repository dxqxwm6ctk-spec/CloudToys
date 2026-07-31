import { useWishlist } from '../context/WishlistContext';
import { PageTransition } from '../components/ui/PageTransition';
import { ProductCard } from '../components/ui/ProductCard';
import { Link } from 'wouter';
import { Heart } from 'lucide-react';

export function Wishlist() {
  const { items } = useWishlist();

  return (
    <PageTransition>
      <div className="bg-secondary/50 py-16 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-primary">
            <Heart className="w-8 h-8" fill="currentColor" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-4">Your Wishlist</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {items.length === 0 
              ? "You haven't saved any items yet." 
              : `You have ${items.length} item${items.length === 1 ? '' : 's'} saved.`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 min-h-[50vh]">
        {items.length === 0 ? (
          <div className="text-center">
            <Link 
              href="/shop" 
              className="inline-flex bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Discover Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
