import { Link, useLocation } from 'wouter';
import { ShoppingBag, Heart, Search, User, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [location, setLocation] = useLocation();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-border shadow-sm' : 'bg-white/50 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 -ml-2 text-foreground"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-primary flex-shrink-0">
          Cloud Toys
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors">
            Shop All
          </Link>
          <Link href="/categories" className="text-sm font-medium hover:text-primary transition-colors">
            Categories
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
            About Us
          </Link>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-4 lg:gap-6">
          <form onSubmit={handleSearch} className="hidden md:flex relative group">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 bg-transparent border-b border-border py-1 px-2 text-sm focus:outline-none focus:border-primary transition-colors group-hover:border-primary/50"
            />
            <button type="submit" className="absolute right-0 top-1.5 text-muted-foreground hover:text-primary">
              <Search className="w-4 h-4" />
            </button>
          </form>

          <Link href="/account" className="text-foreground hover:text-primary transition-colors hidden sm:block">
            <User className="w-5 h-5" />
          </Link>

          <Link href="/wishlist" className="text-foreground hover:text-primary transition-colors relative">
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-accent-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/cart" className="text-foreground hover:text-primary transition-colors relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <div className="p-4 flex items-center justify-between border-b">
              <span className="font-serif text-2xl font-bold text-primary">Cloud Toys</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary rounded-md py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </form>
              <nav className="flex flex-col gap-4 text-lg">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link href="/shop" onClick={() => setMobileMenuOpen(false)}>Shop All</Link>
                <Link href="/categories" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
                <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                <Link href="/account" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
                <Link href="/track-order" onClick={() => setMobileMenuOpen(false)}>Track Order</Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
