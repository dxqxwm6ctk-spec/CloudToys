import { useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { useToast } from '@/hooks/use-toast';
import { Mail, MapPin, Phone } from 'lucide-react';

export function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast({
        title: "Message Sent",
        description: "We'll get back to you within 24 hours.",
      });
    }, 1000);
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Info */}
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">Get in touch</h1>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
              Have a question about a product, your order, or just want to say hello? We'd love to hear from you.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email us</h3>
                  <p className="text-muted-foreground">hello@cloudtoys.com</p>
                  <p className="text-sm text-muted-foreground mt-1">We aim to respond within 24 hours.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Call us</h3>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  <p className="text-sm text-muted-foreground mt-1">Mon-Fri, 9am to 5pm EST</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Studio</h3>
                  <p className="text-muted-foreground">123 Design Avenue<br/>Brooklyn, NY 11201</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-secondary/30 p-8 md:p-12 rounded-3xl">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif font-semibold mb-4">Thank you for reaching out</h3>
                <p className="text-muted-foreground mb-8">We've received your message and will respond shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="text-primary font-medium hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <input required type="text" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <input required type="text" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <input required type="email" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order Number (Optional)</label>
                  <input type="text" className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea required rows={5} className="w-full bg-white border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium text-lg flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
