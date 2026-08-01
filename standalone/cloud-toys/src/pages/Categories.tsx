import { useListCategories } from '@/lib/api-client-react';
import { PageTransition } from '../components/ui/PageTransition';
import { CategoryCard } from '../components/ui/CategoryCard';

export function Categories() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <PageTransition>
      <div className="bg-secondary/50 py-16 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl font-bold mb-4">Shop by Category</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find the perfect toy for every stage of development and imagination.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-secondary animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories?.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
