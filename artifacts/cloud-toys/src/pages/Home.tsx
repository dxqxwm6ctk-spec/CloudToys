import { Link } from 'wouter';
import { PageTransition } from '../components/ui/PageTransition';
import { useListFeaturedProducts, useListBestSellerProducts, useListCategories } from '@workspace/api-client-react';
import heroBg from '@assets/hero-bg.jpg';
import aboutBg from '@assets/about-bg.jpg';
import { ProductCard } from '../components/ui/ProductCard';
import { CategoryCard } from '../components/ui/CategoryCard';
import { motion } from 'framer-motion';

export function Home() {
  const { data: featured } = useListFeaturedProducts();
  const { data: bestSellers } = useListBestSellerProducts();
  const { data: categories } = useListCategories();

  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-secondary">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg}
            alt="Premium Wooden Toys" 
            className="w-full h-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent lg:bg-gradient-to-r lg:from-white/80 lg:via-white/50 lg:to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 flex">
          <div className="max-w-2xl text-white lg:text-foreground">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6"
            >
              Play, <br/><span className="text-primary lg:text-primary">beautifully.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-xl mb-10 text-white/90 lg:text-muted-foreground leading-relaxed max-w-lg"
            >
              Discover our curated collection of premium wooden and educational toys designed to inspire imagination and look beautiful in your home.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Link 
                href="/shop" 
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Shop Collection
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured && featured.length > 0 && (
        <section className="py-24 container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">Curated for you</h2>
              <p className="text-muted-foreground">Our handpicked selection of exceptional toys.</p>
            </div>
            <Link href="/shop?sort=featured" className="text-primary font-medium hover:underline hidden md:block">
              View all featured
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featured.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-12 text-center">Shop by category</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {categories.slice(0, 3).map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/categories" className="inline-flex px-6 py-3 rounded-full border border-border bg-white text-foreground hover:border-primary hover:text-primary transition-colors font-medium">
                Browse all categories
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Value Prop Section */}
      <section className="py-24 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
            <div className="space-y-4 mt-12">
              <div className="bg-secondary rounded-2xl aspect-[3/4] overflow-hidden">
                <img src={heroBg} alt="Quality" className="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply hover:grayscale-0 hover:mix-blend-normal transition-all duration-700" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-2xl aspect-[3/4] overflow-hidden">
                <img src={aboutBg} alt="Design" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-6 leading-tight">
              A standard of <br/><span className="text-accent">excellence.</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              We believe that toys should be beautiful, durable, and thoughtfully designed. We source only the finest materials to create pieces that can be passed down through generations.
            </p>
            <ul className="space-y-6">
              {[
                { title: 'Sustainable Materials', desc: 'Ethically sourced wood and non-toxic finishes.' },
                { title: 'Heirloom Quality', desc: 'Built to last through years of imaginative play.' },
                { title: 'Considered Design', desc: 'Minimalist aesthetics that look beautiful in any room.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Link href="/about" className="font-medium text-primary hover:underline underline-offset-4">
                Read our story &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      {bestSellers && bestSellers.length > 0 && (
        <section className="py-24 container mx-auto px-4 border-t border-border">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">Loved by parents</h2>
            <p className="text-muted-foreground">Our most popular pieces.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {bestSellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </PageTransition>
  );
}
