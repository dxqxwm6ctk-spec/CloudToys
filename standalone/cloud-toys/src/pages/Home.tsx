import { Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListProducts, useListCategories } from '@/lib/api-client-react';
import { ProductCard } from '../components/ui/ProductCard';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

export function Home() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categoryParam = searchParams.get('category') || undefined;

  const { data, isLoading } = useListProducts({
    category: categoryParam,
    sort: 'featured',
    page: 1,
    pageSize: 20,
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
      <section className="py-3 border-b border-border bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none">
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
      <section className="px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-secondary animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
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
