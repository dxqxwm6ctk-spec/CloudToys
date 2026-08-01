import { PageTransition } from '../components/ui/PageTransition';
import aboutBg from '../assets/about-bg.jpg';
import heroBg from '../assets/hero-bg.jpg';

export function About() {
  return (
    <PageTransition>
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px] flex items-center justify-center bg-secondary overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={aboutBg} 
            alt="Our Workshop" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6">Our Story</h1>
          <p className="text-xl md:text-2xl font-light max-w-2xl mx-auto">
            Crafting beautiful memories through considered design.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="prose prose-lg mx-auto">
            <h2 className="font-serif text-3xl font-semibold text-center mb-8">The Philosophy of Play</h2>
            <p className="text-muted-foreground text-center text-xl leading-relaxed mb-12">
              We started Cloud Toys with a simple belief: the toys our children play with should be as beautiful as the imaginations they inspire.
            </p>
            <p className="text-muted-foreground">
              In a world filled with plastic and disposable goods, we sought a return to permanence. We wanted to create objects that hold weight, both physically and emotionally. Toys that don't flash or make noise, but instead leave room for a child's mind to fill in the blanks.
            </p>
            <p className="text-muted-foreground">
              Every piece in our collection is designed with intention. We use sustainably sourced hardwoods, non-toxic water-based paints, and natural finishes. Our forms are minimalist, allowing the inherent beauty of the materials to shine through while encouraging open-ended play.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-secondary rounded-2xl aspect-square overflow-hidden">
              <img src={heroBg} alt="Design detail" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-semibold mb-6">Designed to be kept</h3>
              <p className="text-muted-foreground mb-6">
                We don't design for a season. We design for generations. A Cloud Toy is meant to be played with, loved, displayed on a shelf, packed away, and eventually handed down to the next generation.
              </p>
              <p className="text-muted-foreground">
                We believe that a beautiful environment fosters a calm and creative mind. That's why our toys are designed not to be hidden away in bins, but to be an aesthetic addition to your living space.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
