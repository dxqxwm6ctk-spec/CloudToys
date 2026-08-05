import { Link, useLocation } from 'wouter';
import { ShoppingBag, Heart, Search, User, Menu, X, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContactInfo } from '@/hooks/useContactInfo';

const SIDEBAR_SHOP_LINKS = [
  { label: 'All Products', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?sort=best-sellers' },
  { label: 'Featured', href: '/shop?sort=featured' },
];

const SIDEBAR_SUPPORT_LINKS = [
  { label: 'Contact Us', href: '/contact' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Shipping Policy', href: '#' },
  { label: 'Returns', href: '#' },
  { label: 'FAQ', href: '#' },
];

const NAV_LINKS = [
  { label: 'Shop All', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'About', href: '/about' },
];

export function Header() {
  const [, setLocation] = useLocation();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const contact = useContactInfo();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  // Live search — navigate as the user types, without needing to press Enter.
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed) {
      const timeout = setTimeout(() => {
        setLocation(`/shop?search=${encodeURIComponent(trimmed)}`, { replace: true });
      }, 350);
      return () => clearTimeout(timeout);
    }

    // Text was cleared — drop back to the main listing instead of staying
    // stuck on the (now empty) search results.
    const params = new URLSearchParams(window.location.search);
    if (params.has('search')) {
      params.delete('search');
      const query = params.toString();
      setLocation(query ? `/shop?${query}` : '/shop', { replace: true });
    }
    return undefined;
  }, [searchQuery, setLocation]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)]'
            : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4">

          {/* Mobile: Hamburger */}
          <button
            className="lg:hidden p-1.5 -ml-1.5 text-gray-700 hover:text-[#7A1F3D] transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-baseline gap-1">
            <span className="font-serif text-xl md:text-2xl font-bold text-[#7A1F3D] tracking-tight">Cloud</span>
            <span className="font-serif text-xl md:text-2xl font-light text-gray-800 tracking-tight">Toys</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-[#7A1F3D] transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#7A1F3D] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(s => !s)}
              className="p-2 text-gray-600 hover:text-[#7A1F3D] transition-colors rounded-full hover:bg-[#7A1F3D]/5"
              aria-label="Search"
            >
              <Search className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </button>

            <Link
              href="/account"
              className="p-2 text-gray-600 hover:text-[#7A1F3D] transition-colors rounded-full hover:bg-[#7A1F3D]/5 hidden sm:flex"
              aria-label="Account"
            >
              <User className="w-[18px] h-[18px]" />
            </Link>

            <Link
              href="/wishlist"
              className="p-2 text-gray-600 hover:text-[#7A1F3D] transition-colors rounded-full hover:bg-[#7A1F3D]/5 relative"
              aria-label="Wishlist"
            >
              <Heart className="w-[18px] h-[18px]" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#C9A227] text-white rounded-full text-[9px] flex items-center justify-center font-bold leading-none">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 ml-1 bg-[#7A1F3D] text-white pl-3 pr-4 py-2 rounded-full text-sm font-medium hover:bg-[#6a1b35] transition-all duration-200 hover:shadow-md relative"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Bag</span>
              {cartCount > 0 && (
                <span className="ml-0.5 bg-white text-[#7A1F3D] rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold leading-none">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search Bar — inline drop */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-gray-100 bg-white"
            >
              <form onSubmit={handleSearch} className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search for toys, categories…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-baseline gap-1">
                  <span className="font-serif text-xl font-bold text-[#7A1F3D]">Cloud</span>
                  <span className="font-serif text-xl font-light text-gray-800">Toys</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="px-5 pt-5">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              </form>

              {/* Nav Links */}
              <nav className="flex-1 px-4 pt-6 pb-6 space-y-1 overflow-y-auto">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Shop All', href: '/shop' },
                  { label: 'Categories', href: '/categories' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                ].map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-3.5 rounded-xl text-gray-800 font-medium hover:bg-[#7A1F3D]/5 hover:text-[#7A1F3D] transition-colors group"
                  >
                    {link.label}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7A1F3D]" />
                  </Link>
                ))}

                {/* Shop links (moved here from the footer, which is hidden on Home) */}
                <div className="pt-5 mt-3 border-t border-gray-100">
                  <h4 className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Shop</h4>
                  {SIDEBAR_SHOP_LINKS.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#7A1F3D] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Support links */}
                <div className="pt-5 mt-3 border-t border-gray-100">
                  <h4 className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Support</h4>
                  {SIDEBAR_SUPPORT_LINKS.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#7A1F3D] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Contact info */}
                <div className="pt-5 mt-3 border-t border-gray-100">
                  <h4 className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Contact</h4>
                  <ul className="space-y-3 px-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      {contact.email}
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      {contact.phone}
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
                      {contact.address}
                    </li>
                  </ul>
                </div>
              </nav>

              {/* Bottom actions */}
              <div className="p-5 border-t border-gray-100 flex gap-3">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#7A1F3D] hover:text-[#7A1F3D] transition-colors"
                >
                  <User className="w-4 h-4" /> Account
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#7A1F3D] hover:text-[#7A1F3D] transition-colors"
                >
                  <Heart className="w-4 h-4" /> Wishlist
                  {wishlistCount > 0 && <span className="text-[#C9A227] font-bold">({wishlistCount})</span>}
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
