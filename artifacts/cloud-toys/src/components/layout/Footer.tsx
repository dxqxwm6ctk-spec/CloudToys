import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <span className="font-serif text-2xl font-bold text-primary block mb-6">Cloud Toys</span>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Curated, high-quality wooden and educational toys for mindful parents and imaginative children.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif font-semibold text-lg mb-6">Shop</h4>
            <ul className="space-y-4">
              <li><Link href="/shop" className="text-muted-foreground hover:text-primary text-sm">All Products</Link></li>
              <li><Link href="/categories" className="text-muted-foreground hover:text-primary text-sm">Categories</Link></li>
              <li><Link href="/shop?sort=newest" className="text-muted-foreground hover:text-primary text-sm">New Arrivals</Link></li>
              <li><Link href="/shop?sort=featured" className="text-muted-foreground hover:text-primary text-sm">Featured</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-lg mb-6">Support</h4>
            <ul className="space-y-4">
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary text-sm">Contact Us</Link></li>
              <li><Link href="/track-order" className="text-muted-foreground hover:text-primary text-sm">Track Order</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary text-sm">Shipping Policy</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary text-sm">Returns & Exchanges</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-lg mb-6">Stay in touch</h4>
            <p className="text-muted-foreground text-sm mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 bg-secondary border-none rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cloud Toys. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-muted-foreground hover:text-primary text-sm">Privacy Policy</Link>
            <Link href="#" className="text-muted-foreground hover:text-primary text-sm">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
