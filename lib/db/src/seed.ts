/**
 * Idempotent seed script for Cloud Toys.
 * Run with: pnpm --filter @workspace/db run seed
 *
 * Safe to run multiple times — uses INSERT … ON CONFLICT DO NOTHING.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import {
  categoriesTable,
  productsTable,
  reviewsTable,
  ordersTable,
  paymentMethodsTable,
} from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running the seed.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱  Seeding Cloud Toys database…");

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await db
    .insert(categoriesTable)
    .values([
      {
        name: "Action Figures",
        slug: "action-figures",
        imageUrl:
          "https://images.unsplash.com/photo-1608889175157-62f8d3b56e3c?w=600&q=80",
      },
      {
        name: "Building Blocks",
        slug: "building-blocks",
        imageUrl:
          "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80",
      },
      {
        name: "Stuffed Animals",
        slug: "stuffed-animals",
        imageUrl:
          "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&q=80",
      },
      {
        name: "Educational",
        slug: "educational",
        imageUrl:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
      },
      {
        name: "Outdoor Play",
        slug: "outdoor-play",
        imageUrl:
          "https://images.unsplash.com/photo-1598214886806-c0d2a541e3bb?w=600&q=80",
      },
      {
        name: "Arts & Crafts",
        slug: "arts-crafts",
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80",
      },
    ])
    .onConflictDoNothing()
    .returning({ id: categoriesTable.id, slug: categoriesTable.slug });

  console.log(`  ✓ ${categories.length} categories inserted (or already exist)`);

  // Resolve category IDs by slug for FK references below
  const allCategories = await db.select().from(categoriesTable);
  const catId = Object.fromEntries(allCategories.map((c) => [c.slug, c.id]));

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await db
    .insert(productsTable)
    .values([
      {
        slug: "classic-robot-explorer",
        name: "Classic Robot Explorer",
        shortDescription:
          "Articulated robot with light-up eyes and sound effects",
        description:
          "Meet the Classic Robot Explorer — a premium die-cast and ABS plastic action figure packed with LED eye lights, four sound effects, and 12 points of articulation. Hours of imaginative play guaranteed.",
        price: "49.99",
        compareAtPrice: "64.99",
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1608889175157-62f8d3b56e3c?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1608889175157-62f8d3b56e3c?w=800&q=80",
        ],
        categoryId: catId["action-figures"]!,
        rating: "4.8",
        reviewCount: 124,
        inStock: true,
        badge: "bestseller",
        features: [
          "LED light-up eyes",
          "4 authentic sound effects",
          "12-point articulation",
          "Die-cast metal body",
        ],
      },
      {
        slug: "stellar-blocks-200",
        name: "Stellar Blocks 200",
        shortDescription:
          "200-piece magnetic building set for endless creativity",
        description:
          "The Stellar Blocks 200 is a magnetic construction set with 200 premium pieces — triangles, squares, and hexagons — that snap together satisfyingly. Spark spatial reasoning and creativity in kids 3+.",
        price: "79.99",
        compareAtPrice: null,
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
        ],
        categoryId: catId["building-blocks"]!,
        rating: "4.9",
        reviewCount: 213,
        inStock: true,
        badge: "new",
        features: [
          "200 magnetic pieces",
          "BPA-free ABS plastic",
          "Ages 3+",
          "Comes with idea booklet",
        ],
      },
      {
        slug: "plush-polar-bear",
        name: "Plush Polar Bear",
        shortDescription: "Ultra-soft premium stuffed polar bear, 18 inches",
        description:
          "Crafted from hypoallergenic ultra-plush fabric, this 18-inch polar bear becomes a lifelong companion. Machine washable. Meets all US safety standards.",
        price: "39.99",
        compareAtPrice: "49.99",
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&q=80",
        ],
        categoryId: catId["stuffed-animals"]!,
        rating: "4.7",
        reviewCount: 98,
        inStock: true,
        badge: null,
        features: [
          "18-inch height",
          "Hypoallergenic fill",
          "Machine washable",
          "CE and ASTM certified",
        ],
      },
      {
        slug: "math-genius-kit",
        name: "Math Genius Kit",
        shortDescription: "Hands-on math learning kit for ages 5–10",
        description:
          "The Math Genius Kit uses tactile counters, number tiles, and guided activity cards to make arithmetic intuitive. Trusted by 10,000+ parents and teachers.",
        price: "34.99",
        compareAtPrice: null,
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
        ],
        categoryId: catId["educational"]!,
        rating: "4.6",
        reviewCount: 77,
        inStock: true,
        badge: "new",
        features: [
          "150 tactile pieces",
          "40 activity cards",
          "Ages 5–10",
          "Aligned with Common Core",
        ],
      },
      {
        slug: "adventure-swing-set",
        name: "Adventure Swing Set",
        shortDescription:
          "Premium cedar wood swing set with slide and climbing wall",
        description:
          "Built from sustainably sourced cedar, the Adventure Swing Set includes two belt swings, a 6-foot wave slide, and a beginner climbing wall. Rated for up to 800 lbs combined.",
        price: "499.99",
        compareAtPrice: "599.99",
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1598214886806-c0d2a541e3bb?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1598214886806-c0d2a541e3bb?w=800&q=80",
        ],
        categoryId: catId["outdoor-play"]!,
        rating: "4.9",
        reviewCount: 56,
        inStock: true,
        badge: "sale",
        features: [
          "Cedar construction",
          "6-foot wave slide",
          "Climbing wall",
          "800 lb weight capacity",
        ],
      },
      {
        slug: "deluxe-art-studio",
        name: "Deluxe Art Studio",
        shortDescription:
          "120-piece professional-grade art kit for budding artists",
        description:
          "Everything a young artist needs: 24 watercolors, 36 colored pencils, 12 oil pastels, sketch pads, and a sturdy wooden carrying case. Professional quality at a junior price.",
        price: "59.99",
        compareAtPrice: "74.99",
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
        ],
        categoryId: catId["arts-crafts"]!,
        rating: "4.8",
        reviewCount: 143,
        inStock: true,
        badge: "bestseller",
        features: [
          "120 art supplies",
          "Wooden carrying case",
          "Non-toxic pigments",
          "Ages 6+",
        ],
      },
      {
        slug: "space-rover-rc",
        name: "Space Rover RC",
        shortDescription: "Remote-controlled Mars rover with 360° stunts",
        description:
          "The Space Rover RC mimics NASA rover aesthetics with a 2.4GHz remote, full 360° flip capability, and independent suspension. Up to 45 minutes of battery life.",
        price: "89.99",
        compareAtPrice: null,
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1608889175157-62f8d3b56e3c?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1608889175157-62f8d3b56e3c?w=800&q=80",
        ],
        categoryId: catId["action-figures"]!,
        rating: "4.5",
        reviewCount: 89,
        inStock: true,
        badge: "new",
        features: [
          "2.4GHz control",
          "360° flip stunts",
          "45-min battery",
          "All-terrain suspension",
        ],
      },
      {
        slug: "wooden-kitchen-set",
        name: "Wooden Kitchen Set",
        shortDescription:
          "Montessori-style wooden play kitchen with accessories",
        description:
          "Inspired by Montessori principles, this solid birch play kitchen includes a sink with turning knobs, a stove with clicking dials, 20 food accessories, and non-toxic paint. Ages 2–6.",
        price: "149.99",
        compareAtPrice: "179.99",
        currency: "USD",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        ],
        categoryId: catId["educational"]!,
        rating: "4.9",
        reviewCount: 201,
        inStock: true,
        badge: "bestseller",
        features: [
          "Solid birch wood",
          "20 food accessories",
          "Non-toxic paint",
          "Ages 2–6",
        ],
      },
    ])
    .onConflictDoNothing()
    .returning({ id: productsTable.id, slug: productsTable.slug });

  console.log(`  ✓ ${products.length} products inserted (or already exist)`);

  // Resolve product IDs by slug for FK references in reviews
  const allProducts = await db.select().from(productsTable);
  const prodId = Object.fromEntries(allProducts.map((p) => [p.slug, p.id]));

  // ── Reviews ───────────────────────────────────────────────────────────────
  const reviews = await db
    .insert(reviewsTable)
    .values([
      {
        productId: prodId["classic-robot-explorer"]!,
        author: "Sarah M.",
        rating: "5",
        comment:
          "My son absolutely loves this! The lights and sounds are a huge hit at home. Feels very premium.",
        date: new Date("2026-07-22"),
      },
      {
        productId: prodId["classic-robot-explorer"]!,
        author: "James T.",
        rating: "4",
        comment:
          "Great quality. Took a few minutes to figure out the sound modes, but once we did — perfect.",
        date: new Date("2026-07-27"),
      },
      {
        productId: prodId["stellar-blocks-200"]!,
        author: "Priya K.",
        rating: "5",
        comment:
          "Best building set we own. My daughter has spent hours making castles and bridges.",
        date: new Date("2026-07-24"),
      },
      {
        productId: prodId["stellar-blocks-200"]!,
        author: "Tom W.",
        rating: "5",
        comment:
          "The magnets are super strong and the pieces feel durable. No sharp edges, safe for toddlers.",
        date: new Date("2026-07-29"),
      },
      {
        productId: prodId["plush-polar-bear"]!,
        author: "Emma R.",
        rating: "5",
        comment:
          "So incredibly soft! My daughter takes it everywhere. Machine wash works perfectly.",
        date: new Date("2026-07-20"),
      },
      {
        productId: prodId["adventure-swing-set"]!,
        author: "David L.",
        rating: "5",
        comment:
          "Worth every penny. Assembly took about 2 hours but the result is stunning. Kids are obsessed.",
        date: new Date("2026-07-12"),
      },
      {
        productId: prodId["deluxe-art-studio"]!,
        author: "Olivia N.",
        rating: "5",
        comment:
          "Incredible value. The pencils and watercolors are genuinely professional quality. My 8-year-old is thriving.",
        date: new Date("2026-07-25"),
      },
      {
        productId: prodId["wooden-kitchen-set"]!,
        author: "Mei C.",
        rating: "5",
        comment:
          "Beautiful craftsmanship. The clicking dials and sink knobs are so satisfying. Our toddler plays every day.",
        date: new Date("2026-07-17"),
      },
    ])
    .onConflictDoNothing()
    .returning({ id: reviewsTable.id });

  console.log(`  ✓ ${reviews.length} reviews inserted (or already exist)`);

  // ── Sample order for tracking demo ────────────────────────────────────────
  const orders = await db
    .insert(ordersTable)
    .values([
      {
        orderNumber: "CT-2026-00142",
        status: "In Transit",
        estimatedDelivery: "August 5, 2026",
        steps: [
          { label: "Order Placed", completed: true, date: "July 29, 2026" },
          {
            label: "Payment Confirmed",
            completed: true,
            date: "July 29, 2026",
          },
          { label: "Shipped", completed: true, date: "August 1, 2026" },
          { label: "Out for Delivery", completed: false, date: null },
          { label: "Delivered", completed: false, date: null },
        ],
      },
    ])
    .onConflictDoNothing()
    .returning({ orderNumber: ordersTable.orderNumber });

  console.log(`  ✓ ${orders.length} orders inserted (or already exist)`);

  // ── Payment methods ────────────────────────────────────────────────────────
  const paymentMethods = await db
    .insert(paymentMethodsTable)
    .values([
      {
        key: "credit_card",
        label: "Credit / Debit Card",
        description: "Visa, Mastercard, and more — secured by 3D Secure",
        enabled: true,
      },
      {
        key: "cash_on_delivery",
        label: "Cash on Delivery",
        description: "Pay in cash when your order arrives",
        enabled: true,
      },
    ])
    .onConflictDoNothing()
    .returning({ key: paymentMethodsTable.key });

  console.log(`  ✓ ${paymentMethods.length} payment methods inserted (or already exist)`);

  console.log("✅  Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
