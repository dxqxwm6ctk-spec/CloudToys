import { useLocation, useSearch } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { resolveMediaUrl, useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/ui/ProductCard';
import { useState } from 'react';
import { Filter, Check, LayoutGrid } from 'lucide-react';
import type { ListProductsSort } from '@workspace/api-client-react';

export function Shop() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  
  const categoryParam = searchParams.get('category') || undefined;
  const searchParam = searchParams.get('search') || undefined;
  const sortParam = (searchParams.get('sort') as ListProductsSort) || undefined;

  const [page, setPage] = useState(1);
  // Keep the full catalog visible in one grid. The previous 12-item page
  // made the remaining products look missing unless the user noticed the
  // pagination controls below the grid.
  const pageSize = 100;

  const { data, isLoading, isError, error, refetch } = useListProducts({
    category: categoryParam,
    search: searchParam,
    sort: sortParam,
    page,
    pageSize
  });

  const { data: categories } = useListCategories();

  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (key: string, value: string | undefined) => {
    // Read the current Wouter search state instead of window.location so the
    // page re-renders immediately after an in-app filter click.
    const params = new URLSearchParams(search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page on filter change
    setPage(1);
    const query = params.toString();
    setLocation(query ? `/shop?${query}` : '/shop');
  };

  const sortOptions = [
    { label: 'Featured', value: 'featured' },
    { label: 'Newest Arrivals', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Highest Rated', value: 'rating' },
  ];

  return (
    <PageTransition>
      {/* Visual category rail: square cards with the category image inside. */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div
            className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="category-rail"
            aria-label="Shop by category"
          >
            <button
              type="button"
              data-testid="category-all"
              onClick={() => updateFilters('category', undefined)}
              className={`group flex h-[104px] w-[84px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border px-2 transition-colors md:h-[112px] md:w-[92px] ${
                !categoryParam
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              <span className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full md:h-16 md:w-16 ${
                !categoryParam ? 'bg-primary-foreground/15' : 'bg-secondary'
              }`}>
                <LayoutGrid className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold md:text-xs">All</span>
            </button>
            {categories?.filter((category) => category.productCount > 0).map((category) => {
              const selected = categoryParam === category.slug;
              return (
                <button
                  key={category.id}
                  type="button"
                  data-testid={`category-${category.id}`}
                  onClick={() => updateFilters('category', category.slug)}
                  className={`group flex h-[104px] w-[84px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border px-2 transition-colors md:h-[112px] md:w-[92px] ${
                    selected
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-primary/40'
                  }`}
                >
                  <span className={`block h-14 w-14 overflow-hidden rounded-full border-2 md:h-16 md:w-16 ${
                    selected
                      ? 'border-primary-foreground/80 ring-2 ring-primary-foreground/70 ring-offset-2 ring-offset-primary'
                      : 'border-border bg-secondary'
                  }`}>
                    <img
                      src={resolveMediaUrl(category.imageUrl)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="max-w-[78px] truncate text-[11px] font-semibold md:max-w-[100px] md:text-xs">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:gap-8 md:py-12">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden flex justify-between items-center pb-4 border-b border-border">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 font-medium"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <div className="text-sm text-muted-foreground">{data?.total || 0} Products</div>
        </div>

        {/* Sidebar Filters */}
        <aside className={`md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="sticky top-28 space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 font-serif">Categories</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => updateFilters('category', undefined)}
                    className={`text-sm flex items-center gap-2 ${!categoryParam ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {!categoryParam && <Check className="w-3 h-3" />}
                    All Categories
                  </button>
                </li>
                {categories?.map(cat => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => updateFilters('category', cat.slug)}
                      className={`text-sm flex items-center gap-2 ${categoryParam === cat.slug ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {categoryParam === cat.slug && <Check className="w-3 h-3" />}
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 font-serif">Sort By</h3>
              <ul className="space-y-3">
                {sortOptions.map(opt => (
                  <li key={opt.value}>
                    <button 
                      onClick={() => updateFilters('sort', opt.value)}
                      className={`text-sm flex items-center gap-2 ${sortParam === opt.value || (!sortParam && opt.value === 'featured') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {(sortParam === opt.value || (!sortParam && opt.value === 'featured')) && <Check className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {(categoryParam || searchParam || sortParam) && (
              <button 
                onClick={() => setLocation('/shop')}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="hidden md:flex justify-between items-center mb-8 pb-4 border-b border-border">
            <div className="text-sm text-muted-foreground">Showing {data?.items.length || 0} of {data?.total || 0} products</div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-secondary rounded-2xl aspect-[4/5] mb-4"></div>
                  <div className="h-4 bg-secondary rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-secondary rounded w-full mb-2"></div>
                  <div className="h-4 bg-secondary rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-24 space-y-4">
              <h3 className="text-2xl font-serif font-medium mb-2 text-destructive">Couldn't load products</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error instanceof Error ? error.message : 'The store could not reach the server. Check the API connection and try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90"
              >
                Try again
              </button>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="text-2xl font-serif font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search query.</p>
              <button 
                onClick={() => setLocation('/shop')}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-6 lg:grid-cols-3 lg:gap-8">
                {data?.items.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {data && data.total > pageSize && (
                <div className="mt-16 flex justify-center gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 border border-border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-secondary"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-medium flex items-center">
                    Page {page} of {Math.ceil(data.total / pageSize)}
                  </span>
                  <button 
                    disabled={page >= Math.ceil(data.total / pageSize)}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 border border-border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
