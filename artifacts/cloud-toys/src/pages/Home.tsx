import { Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/ui/ProductCard';
import { motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';

export function Home() {
  const [, setLocation] = useLocation();
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

  const updateCategory = (slug: string | undefined) => {
    const params = new URLSearchParams(window.location.search);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    setLocation(`/?${params.toString()}`);
  };

  return (
    <PageTransition>

      {/* Category pills */}
      <section className="py-3 border-b border-border bg-white sticky top-16 md:top-20 z-30 shadow-sm">
        <div className="flex gap-2 overflow-x-auto px-4 lg:max-w-7xl lg:mx-auto lg:px-8 scrollbar-none">
          <button
            onClick={() => updateCategory(undefined)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !categoryParam
                ? 'bg-primary text-white'
                : 'border border-border bg-white text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            All
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => updateCategory(cat.slug)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryParam === cat.slug
                  ? 'bg-primary text-white'
                  : 'border border-border bg-white text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {cat.name}
            </button>
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
            <button
              onClick={() => updateCategory(undefined)}
              className="text-sm text-primary underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

    </PageTransition>
  );
}
