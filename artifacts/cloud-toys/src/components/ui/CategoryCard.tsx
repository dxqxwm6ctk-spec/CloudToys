import { Link } from 'wouter';
import { motion } from 'framer-motion';
import type { Category } from '@workspace/api-client-react/src/generated/api.schemas';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/shop?category=${category.slug}`} className="group relative block overflow-hidden rounded-2xl aspect-square">
      <motion.div
        className="w-full h-full"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={category.imageUrl}
          alt={category.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </motion.div>
      <div className="absolute bottom-6 left-6 right-6 text-white">
        <h3 className="font-serif text-2xl font-semibold mb-1">{category.name}</h3>
        <p className="text-white/80 text-sm">{category.productCount} Products</p>
      </div>
    </Link>
  );
}
