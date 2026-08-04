import { Link } from 'wouter';
import { Instagram, Twitter, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useContactInfo } from '@/hooks/useContactInfo';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const contact = useContactInfo();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#1A0A0F] text-white/80 mt-24">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="font-serif text-2xl md:text-3xl font-semibold text-white mb-2">
              The Cloud Toys Journal
            </h3>
            <p className="text-white/60 text-sm">Early access, new arrivals, and curated guides for thoughtful parents.</p>
          </div>
          {subscribed ? (
            <p className="text-[#C9A227] font-medium text-sm">✓ You're on the list — thank you!</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 md:w-64 bg-white/8 border border-white/15 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#C9A227]/60 transition-colors"
              />
              <button
                type="submit"
                className="bg-[#C9A227] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#b08e20] transition-all duration-200 hover:shadow-lg whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-baseline gap-1 mb-5 inline-flex">
            <span className="font-serif text-2xl font-bold text-white">Cloud</span>
            <span className="font-serif text-2xl font-light text-white/70">Toys</span>
          </Link>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Premium wooden & educational toys, thoughtfully designed for imaginative childhood.
          </p>
          <div className="flex gap-3">
            {[
              { Icon: Instagram, href: '#' },
              { Icon: Twitter, href: '#' },
              { Icon: Facebook, href: '#' },
            ].map(({ Icon, href }, i) => (
              <a
                key={i}
                href={href}
                className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Shop</h4>
          <ul className="space-y-3.5">
            {[
              ['All Products', '/shop'],
              ['Categories', '/categories'],
              ['New Arrivals', '/shop?sort=newest'],
              ['Best Sellers', '/shop?sort=best-sellers'],
              ['Featured', '/shop?sort=featured'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Support</h4>
          <ul className="space-y-3.5">
            {[
              ['Contact Us', '/contact'],
              ['Track Order', '/track-order'],
              ['Shipping Policy', '#'],
              ['Returns', '#'],
              ['FAQ', '#'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Contact</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-sm text-white/50">
              <Mail className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
              {contact.email}
            </li>
            <li className="flex items-start gap-3 text-sm text-white/50">
              <Phone className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
              {contact.phone}
            </li>
            <li className="flex items-start gap-3 text-sm text-white/50">
              <MapPin className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
              {contact.address}
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Cloud Toys. All rights reserved.
          </p>
          <div className="flex gap-6">
            {[['Privacy Policy', '#'], ['Terms of Service', '#'], ['Cookies', '#']].map(([label, href]) => (
              <a key={href} href={href} className="text-xs text-white/30 hover:text-white/60 transition-colors">{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
