import { Link, useLocation } from 'wouter';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { useSubscribeNewsletter } from '@workspace/api-client-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 1.987.579 3.837 1.578 5.395L2 22l4.735-1.545a9.955 9.955 0 0 0 5.269 1.505h.004c5.518 0 10.004-4.486 10.004-10.004 0-2.674-1.04-5.19-2.929-7.079A9.936 9.936 0 0 0 12.004 2Zm0 18.192a8.157 8.157 0 0 1-4.166-1.14l-.299-.178-2.812.918.928-2.75-.194-.283a8.166 8.166 0 0 1-1.267-4.377c0-4.517 3.677-8.192 8.196-8.192a8.14 8.14 0 0 1 5.796 2.402 8.145 8.145 0 0 1 2.399 5.795c0 4.518-3.678 8.195-8.201 8.195Z" />
    </svg>
  );
}

export function Footer() {
  const [location] = useLocation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const contact = useContactInfo();
  const subscribeMutation = useSubscribeNewsletter();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || subscribeMutation.isPending) return;
    setError('');
    subscribeMutation.mutate(
      { data: { email: email.trim() } },
      {
        onSuccess: () => {
          setSubscribed(true);
          setEmail('');
        },
        onError: () => setError('Something went wrong. Please try again.'),
      },
    );
  };

  return (
    <footer className="bg-[#1A0A0F] text-white/80 mt-24">
      {location !== '/categories' && (
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
              <div className="w-full md:w-auto">
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
                    disabled={subscribeMutation.isPending}
                    className="bg-[#C9A227] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#b08e20] transition-all duration-200 hover:shadow-lg whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {subscribeMutation.isPending ? 'Subscribing…' : 'Subscribe'}
                  </button>
                </form>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

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
              { Icon: Instagram, href: 'https://www.instagram.com/cloud_toys99?igsh=YmwxeG1jZHRzM3Ex' },
              { Icon: WhatsAppIcon, href: 'https://wa.me/201550355315' },
              { Icon: Facebook, href: '#' },
            ].map(({ Icon, href }, i) => (
              <a
                key={i}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
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
              ['Best Sellers', '/shop?sort=rating'],
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
