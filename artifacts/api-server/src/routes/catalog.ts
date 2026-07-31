import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
  reviewsTable,
} from "@workspace/db";
import {
  ListCategoriesResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  ListBestSellerProductsResponse,
  ListNewArrivalProductsResponse,
  GetProductParams,
  GetProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toProductDto(
  row: typeof productsTable.$inferSelect & {
    categorySlug: string;
    categoryName: string;
  },
) {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    price: Number(row.price),
    compareAtPrice:
      row.compareAtPrice === null ? null : Number(row.compareAtPrice),
    currency: row.currency,
    imageUrl: row.imageUrl,
    galleryUrls: row.galleryUrls,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    badge: row.badge as "new" | "bestseller" | "sale" | null,
  };
}

router.get("/categories", async (req, res): Promise<void> => {
  req.log.info("Listing categories");
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      imageUrl: categoriesTable.imageUrl,
      productCount: sql<number>`count(${productsTable.id})`.mapWith(Number),
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id);

  res.json(
    ListCategoriesResponse.parse(
      rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        slug: row.slug,
        imageUrl: row.imageUrl,
        productCount: row.productCount,
      })),
    ),
  );
});

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, search, sort, minPrice, maxPrice, page, pageSize } =
    parsed.data;

  const conditions = [];
  if (category) {
    conditions.push(eq(categoriesTable.slug, category));
  }
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }
  if (minPrice !== undefined) {
    conditions.push(gte(productsTable.price, String(minPrice)));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(productsTable.price, String(maxPrice)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    sort === "price_asc"
      ? asc(productsTable.price)
      : sort === "price_desc"
        ? desc(productsTable.price)
        : sort === "rating"
          ? desc(productsTable.rating)
          : sort === "newest"
            ? desc(productsTable.createdAt)
            : desc(productsTable.reviewCount);

  const baseQuery = db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      currency: productsTable.currency,
      imageUrl: productsTable.imageUrl,
      galleryUrls: productsTable.galleryUrls,
      categoryId: productsTable.categoryId,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
      categorySlug: categoriesTable.slug,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    .where(where);

  const [rows, [{ count }]] = await Promise.all([
    baseQuery
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(productsTable)
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(where),
  ]);

  res.json(
    ListProductsResponse.parse({
      items: rows.map(toProductDto),
      total: count,
      page,
      pageSize,
    }),
  );
});

async function listByBadge(badge: "bestseller" | "new" | null, sortDesc = false) {
  const query = db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      currency: productsTable.currency,
      imageUrl: productsTable.imageUrl,
      galleryUrls: productsTable.galleryUrls,
      categoryId: productsTable.categoryId,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
      categorySlug: categoriesTable.slug,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    .where(badge ? eq(productsTable.badge, badge) : undefined)
    .orderBy(sortDesc ? desc(productsTable.createdAt) : desc(productsTable.rating))
    .limit(8);

  return query;
}

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      currency: productsTable.currency,
      imageUrl: productsTable.imageUrl,
      galleryUrls: productsTable.galleryUrls,
      categoryId: productsTable.categoryId,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
      categorySlug: categoriesTable.slug,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    .orderBy(desc(productsTable.rating))
    .limit(8);

  res.json(ListFeaturedProductsResponse.parse(rows.map(toProductDto)));
});

router.get("/products/best-sellers", async (_req, res): Promise<void> => {
  const rows = await listByBadge("bestseller");
  res.json(ListBestSellerProductsResponse.parse(rows.map(toProductDto)));
});

router.get("/products/new-arrivals", async (_req, res): Promise<void> => {
  const rows = await listByBadge("new", true);
  res.json(ListNewArrivalProductsResponse.parse(rows.map(toProductDto)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const idOrSlug = params.data.id;
  const numericId = Number(idOrSlug);

  const [row] = await db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      price: productsTable.price,
      compareAtPrice: productsTable.compareAtPrice,
      currency: productsTable.currency,
      imageUrl: productsTable.imageUrl,
      galleryUrls: productsTable.galleryUrls,
      categoryId: productsTable.categoryId,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
      categorySlug: categoriesTable.slug,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    .where(
      Number.isNaN(numericId)
        ? eq(productsTable.slug, idOrSlug)
        : eq(productsTable.id, numericId),
    );

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [reviews, related] = await Promise.all([
    db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, row.id))
      .orderBy(desc(reviewsTable.date)),
    db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.categoryId, row.categoryId),
          sql`${productsTable.id} != ${row.id}`,
        ),
      )
      .limit(4),
  ]);

  res.json(
    GetProductResponse.parse({
      ...toProductDto(row),
      description: row.description,
      features: row.features,
      reviews: reviews.map((review) => ({
        id: String(review.id),
        author: review.author,
        rating: Number(review.rating),
        comment: review.comment,
        date: review.date.toISOString(),
      })),
      relatedProductIds: related.map((r) => String(r.id)),
    }),
  );
});

export default router;
