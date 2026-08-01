import { useLocation } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/ui/ProductCard';
import { useState, useEffect } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import type { ListProductsSort } from '@workspace/api-client-react';

export function Shop() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const categoryParam = searchParams.get('category') || undefined;
  const searchParam = searchParams.get('search') || undefined;
  const sortParam = (searchParams.get('sort') as ListProductsSort) || undefined;

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading } = useListProducts({
    category: categoryParam,
    search: searchParam,
    sort: sortParam,
    page,
    pageSize
  });

  const { data: categories } = useListCategories();

  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page on filter change
    setPage(1);
    setLocation(`/shop?${params.toString()}`);
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
      <div className="bg-secondary/50 py-12 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl font-bold mb-4">
            {searchParam ? `Search: "${searchParam}"` : categoryParam ? `Category: ${categoryParam}` : 'All Products'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our complete collection of thoughtfully crafted toys, designed to inspire and delight.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-secondary rounded-2xl aspect-[4/5] mb-4"></div>
                  <div className="h-4 bg-secondary rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-secondary rounded w-full mb-2"></div>
                  <div className="h-4 bg-secondary rounded w-1/3"></div>
                </div>
              ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
