import { Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListFeaturedProducts, useListBestSellerProducts, useListCategories } from '@workspace/api-client-react';
import heroBg from '@assets/hero-bg.jpg';
import { ProductCard } from '../components/ui/ProductCard';
import { motion } from 'framer-motion';

export function Home() {
  const { data: featured } = useListFeaturedProducts();
  const { data: bestSellers } = useListBestSellerProducts();
  const { data: categories } = useListCategories();

  const allProducts = [
    ...(featured ?? []),
    ...(bestSellers ?? []).filter(b => !(featured ?? []).find(f => f.id === b.id)),
  ];

  return (
    <PageTransition>

      {/* Compact Hero Banner */}
      <section className="relative h-[220px] md:h-[300px] overflow-hidden bg-secondary">
        <img
          src={heroBg}
          alt="Cloud Toys"
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-white font-serif text-3xl md:text-5xl font-bold leading-tight mb-2"
          >
            Play, <span className="text-primary">beautifully.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-white/80 text-sm md:text-base max-w-sm"
          >
            Premium wooden &amp; educational toys
          </motion.p>
        </div>
      </section>

      {/* Categories horizontal scroll */}
      {categories && categories.length > 0 && (
        <section className="py-4 border-b border-border bg-white sticky top-0 z-10 shadow-sm">
          <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none">
            <Link
              href="/shop"
              className="flex-shrink-0 px-4 py-1.5 rounded-full bg-primary text-white text-sm font-medium whitespace-nowrap"
            >
              All
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className="flex-shrink-0 px-4 py-1.5 rounded-full border border-border bg-white text-foreground text-sm font-medium whitespace-nowrap hover:border-primary hover:text-primary transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product grid — visible immediately */}
      <section className="container mx-auto px-4 py-6">
        {allProducts.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-foreground">Featured Products</h2>
              <Link href="/shop" className="text-sm text-primary font-medium hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allProducts.slice(0, 8).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all shadow hover:shadow-md"
              >
                Browse all products
              </Link>
            </div>
          </>
        ) : (
          /* Loading skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-secondary animate-pulse aspect-[3/4]" />
            ))}
          </div>
        )}
      </section>

      {/* Best sellers strip */}
      {bestSellers && bestSellers.length > 0 && (
        <section className="bg-secondary py-10 mt-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-xl font-semibold">Loved by parents</h2>
              <Link href="/shop?sort=best-sellers" className="text-sm text-primary font-medium hover:underline">
                See more →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {bestSellers.slice(0, 6).map(product => (
                <div key={product.id} className="flex-shrink-0 w-[160px] sm:w-[200px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </PageTransition>
  );
}
