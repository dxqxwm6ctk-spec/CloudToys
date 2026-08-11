import { Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/ui/ProductCard';
import { motion } from 'framer-motion';
import { useSearch } from 'wouter';
import { LayoutGrid } from 'lucide-react';
import { resolveMediaUrl } from '@workspace/api-client-react';

export function Home() {
  const search = useSearch();
  const categoryParam = new URLSearchParams(search).get('category') || undefined;

  const { data, isLoading, isError, error, refetch } = useListProducts({
    category: categoryParam,
    sort: 'featured',
    page: 1,
    // The home catalog is the storefront's main product browser. Request the
    // full collection so products are not silently hidden after the first 20.
    pageSize: 100,
  });

  const { data: categories } = useListCategories();

  return (
    <PageTransition>

      {/* Square category cards */}
      <section className="border-b border-border bg-white sticky top-16 md:top-20 z-30 shadow-sm">
        <div className="flex gap-3 overflow-x-auto px-4 py-4 lg:max-w-7xl lg:mx-auto lg:px-8 scrollbar-none snap-x snap-mandatory">
          <Link
            href="/shop"
            aria-label="All products"
            className={`group flex h-[104px] w-[84px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border px-2 transition-colors md:h-[112px] md:w-[92px] ${
              !categoryParam
                ? 'border-primary bg-primary text-white shadow-sm'
                : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full md:h-16 md:w-16 ${
              !categoryParam ? 'bg-white/15' : 'bg-secondary'
            }`}>
              <LayoutGrid className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold md:text-xs">All</span>
          </Link>
          {categories?.filter(cat => cat.productCount > 0).map(cat => (
            <Link
              key={cat.id}
              href={`/shop?category=${encodeURIComponent(cat.slug)}`}
              className={`group flex h-[104px] w-[84px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border px-2 transition-colors md:h-[112px] md:w-[92px] ${
                categoryParam === cat.slug
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-border bg-white text-foreground hover:border-primary/40'
              }`}
            >
              <span className={`block h-14 w-14 overflow-hidden rounded-full border-2 md:h-16 md:w-16 ${
                categoryParam === cat.slug
                  ? 'border-white/80 ring-2 ring-white/70 ring-offset-2 ring-offset-primary'
                  : 'border-border bg-secondary'
              }`}>
                <img
                  src={resolveMediaUrl(cat.imageUrl)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="max-w-[78px] truncate text-[11px] font-semibold md:max-w-[100px] md:text-xs">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <section className="px-4 py-4 lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-secondary animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-lg font-medium text-destructive">Couldn't load products</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error instanceof Error ? error.message : 'The store could not reach the server. Check the API connection and try again.'}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary underline"
            >
              Try again
            </button>
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
            {data.items.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No products found</p>
            <Link
              href="/shop"
              className="text-sm text-primary underline"
            >
              Clear filters
            </Link>
          </div>
        )}
      </section>

    </PageTransition>
  );
}
