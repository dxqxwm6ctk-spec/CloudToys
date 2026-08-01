import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
  ordersTable,
} from "@workspace/db";
import { deleteProductImageSet } from "./images";
import {
  GetAdminStatsResponse,
  AdminListProductsQueryParams,
  AdminListProductsResponse,
  AdminCreateProductBody,
  AdminCreateProductResponse,
  AdminUpdateProductParams,
  AdminUpdateProductBody,
  AdminUpdateProductResponse,
  AdminDeleteProductParams,
  AdminDeleteProductResponse,
  AdminListCategoriesResponse,
  AdminCreateCategoryBody,
  AdminCreateCategoryResponse,
  AdminUpdateCategoryParams,
  AdminUpdateCategoryBody,
  AdminUpdateCategoryResponse,
  AdminDeleteCategoryParams,
  AdminDeleteCategoryResponse,
  AdminListOrdersQueryParams,
  AdminListOrdersResponse,
  AdminUpdateOrderStatusParams,
  AdminUpdateOrderStatusBody,
  AdminUpdateOrderStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Helper ─────────────────────────────────────────────────────────────────

function toAdminProductDto(
  row: Pick<
    typeof productsTable.$inferSelect,
    | "id"
    | "slug"
    | "name"
    | "shortDescription"
    | "description"
    | "price"
    | "compareAtPrice"
    | "currency"
    | "imageUrl"
    | "galleryUrls"
    | "thumbUrl"
    | "mediumUrl"
    | "largeUrl"
    | "lqip"
    | "imageAlt"
    | "categoryId"
    | "rating"
    | "reviewCount"
    | "inStock"
    | "badge"
    | "features"
    | "createdAt"
  > & {
    categoryName: string;
  },
) {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,
    price: Number(row.price),
    compareAtPrice:
      row.compareAtPrice === null ? null : Number(row.compareAtPrice),
    currency: row.currency,
    imageUrl: row.imageUrl,
    galleryUrls: row.galleryUrls,
    thumbUrl: row.thumbUrl ?? null,
    mediumUrl: row.mediumUrl ?? null,
    largeUrl: row.largeUrl ?? null,
    lqip: row.lqip ?? null,
    imageAlt: row.imageAlt ?? null,
    categoryId: String(row.categoryId),
    categoryName: row.categoryName,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    badge: row.badge as "new" | "bestseller" | "sale" | null,
    features: row.features,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Stats ──────────────────────────────────────────────────────────────────

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [productStats, categoryCount, orderCount] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        inStock: sql<number>`count(*) filter (where ${productsTable.inStock} = true)`.mapWith(Number),
        outOfStock: sql<number>`count(*) filter (where ${productsTable.inStock} = false)`.mapWith(Number),
      })
      .from(productsTable),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(categoriesTable),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(ordersTable),
  ]);

  res.json(
    GetAdminStatsResponse.parse({
      totalProducts: productStats[0].total,
      totalCategories: categoryCount[0].count,
      totalOrders: orderCount[0].count,
      inStockProducts: productStats[0].inStock,
      outOfStockProducts: productStats[0].outOfStock,
    }),
  );
});

// ── Products ───────────────────────────────────────────────────────────────

router.get("/admin/products", async (req, res): Promise<void> => {
  const parsed = AdminListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, category, page, pageSize } = parsed.data;

  const conditions = [];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (category) conditions.push(eq(categoriesTable.slug, category));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
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
        thumbUrl: productsTable.thumbUrl,
        mediumUrl: productsTable.mediumUrl,
        largeUrl: productsTable.largeUrl,
        lqip: productsTable.lqip,
        imageAlt: productsTable.imageAlt,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        rating: productsTable.rating,
        reviewCount: productsTable.reviewCount,
        inStock: productsTable.inStock,
        badge: productsTable.badge,
        features: productsTable.features,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(where)
      .orderBy(desc(productsTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(where),
  ]);

  res.json(
    AdminListProductsResponse.parse({
      items: rows.map(toAdminProductDto),
      total: count,
      page,
      pageSize,
    }),
  );
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    slug, name, shortDescription, description, price, compareAtPrice,
    currency, imageUrl, galleryUrls, thumbUrl, mediumUrl, largeUrl,
    categoryId, inStock, badge, features,
  } = parsed.data;

  const [inserted] = await db
    .insert(productsTable)
    .values({
      slug,
      name,
      shortDescription,
      description,
      price: String(price),
      compareAtPrice: compareAtPrice != null ? String(compareAtPrice) : null,
      currency: currency ?? "USD",
      imageUrl,
      galleryUrls: galleryUrls ?? [],
      thumbUrl: thumbUrl ?? null,
      mediumUrl: mediumUrl ?? null,
      largeUrl: largeUrl ?? null,
      categoryId: Number(categoryId),
      inStock: inStock ?? true,
      badge: badge ?? null,
      features: features ?? [],
    })
    .returning();

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
      thumbUrl: productsTable.thumbUrl,
      mediumUrl: productsTable.mediumUrl,
      largeUrl: productsTable.largeUrl,
      lqip: productsTable.lqip,
      imageAlt: productsTable.imageAlt,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, inserted.id));

  res.status(201).json(AdminCreateProductResponse.parse(toAdminProductDto(row)));
});

router.put("/admin/products/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminUpdateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = body.data;
  if (d.slug !== undefined) updates.slug = d.slug;
  if (d.name !== undefined) updates.name = d.name;
  if (d.shortDescription !== undefined) updates.shortDescription = d.shortDescription;
  if (d.description !== undefined) updates.description = d.description;
  if (d.price !== undefined) updates.price = String(d.price);
  if (d.compareAtPrice !== undefined) updates.compareAtPrice = d.compareAtPrice != null ? String(d.compareAtPrice) : null;
  if (d.currency !== undefined) updates.currency = d.currency;
  if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl;
  if (d.galleryUrls !== undefined) updates.galleryUrls = d.galleryUrls;
  if (d.thumbUrl !== undefined) updates.thumbUrl = d.thumbUrl;
  if (d.mediumUrl !== undefined) updates.mediumUrl = d.mediumUrl;
  if (d.largeUrl !== undefined) updates.largeUrl = d.largeUrl;
  if (d.categoryId !== undefined) updates.categoryId = Number(d.categoryId);
  if (d.inStock !== undefined) updates.inStock = d.inStock;
  if (d.badge !== undefined) updates.badge = d.badge;
  if (d.features !== undefined) updates.features = d.features;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  // Fetch current image URLs before overwriting so we can delete stale files
  const [before] = await db
    .select({ thumbUrl: productsTable.thumbUrl })
    .from(productsTable)
    .where(eq(productsTable.id, Number(params.data.id)));

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, Number(params.data.id)))
    .returning();

  // If a new image set was uploaded, delete the old one (fire-and-forget)
  if (
    before?.thumbUrl &&
    d.thumbUrl !== undefined &&
    d.thumbUrl !== before.thumbUrl
  ) {
    deleteProductImageSet(before.thumbUrl).catch(() => {});
  }

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

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
      thumbUrl: productsTable.thumbUrl,
      mediumUrl: productsTable.mediumUrl,
      largeUrl: productsTable.largeUrl,
      lqip: productsTable.lqip,
      imageAlt: productsTable.imageAlt,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      rating: productsTable.rating,
      reviewCount: productsTable.reviewCount,
      inStock: productsTable.inStock,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, updated.id));

  res.json(AdminUpdateProductResponse.parse(toAdminProductDto(row)));
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Fetch image URLs before deleting so we can clean up storage
  const [product] = await db
    .select({ thumbUrl: productsTable.thumbUrl })
    .from(productsTable)
    .where(eq(productsTable.id, Number(params.data.id)));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db
    .delete(productsTable)
    .where(eq(productsTable.id, Number(params.data.id)));

  // Delete stored image files after the DB row is gone (fire-and-forget)
  deleteProductImageSet(product.thumbUrl).catch(() => {});

  res.json(AdminDeleteProductResponse.parse({ success: true }));
});

// ── Categories ─────────────────────────────────────────────────────────────

router.get("/admin/categories", async (_req, res): Promise<void> => {
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
    .groupBy(categoriesTable.id)
    .orderBy(asc(categoriesTable.name));

  res.json(
    AdminListCategoriesResponse.parse(
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

router.post("/admin/categories", async (req, res): Promise<void> => {
  const parsed = AdminCreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inserted] = await db
    .insert(categoriesTable)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      imageUrl: parsed.data.imageUrl,
    })
    .returning();

  res.status(201).json(
    AdminCreateCategoryResponse.parse({
      id: String(inserted.id),
      name: inserted.name,
      slug: inserted.slug,
      imageUrl: inserted.imageUrl,
      productCount: 0,
    }),
  );
});

router.put("/admin/categories/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminUpdateCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.slug !== undefined) updates.slug = body.data.slug;
  if (body.data.imageUrl !== undefined) updates.imageUrl = body.data.imageUrl;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, Number(params.data.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const [row] = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      imageUrl: categoriesTable.imageUrl,
      productCount: sql<number>`count(${productsTable.id})`.mapWith(Number),
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(categoriesTable.id, updated.id))
    .groupBy(categoriesTable.id);

  res.json(
    AdminUpdateCategoryResponse.parse({
      id: String(row.id),
      name: row.name,
      slug: row.slug,
      imageUrl: row.imageUrl,
      productCount: row.productCount,
    }),
  );
});

router.delete("/admin/categories/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, Number(params.data.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(AdminDeleteCategoryResponse.parse({ success: true }));
});

// ── Orders ─────────────────────────────────────────────────────────────────

router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsed = AdminListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, page, pageSize } = parsed.data;

  const where = status ? eq(ordersTable.status, status) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(where)
      .orderBy(desc(ordersTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(ordersTable)
      .where(where),
  ]);

  res.json(
    AdminListOrdersResponse.parse({
      items: rows.map((o) => ({
        id: String(o.id),
        orderNumber: o.orderNumber,
        status: o.status,
        estimatedDelivery: o.estimatedDelivery,
        steps: o.steps,
      })),
      total: count,
      page,
      pageSize,
    }),
  );
});

router.put("/admin/orders/:id/status", async (req, res): Promise<void> => {
  const params = AdminUpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminUpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: body.data.status })
    .where(eq(ordersTable.id, Number(params.data.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(
    AdminUpdateOrderStatusResponse.parse({
      id: String(updated.id),
      orderNumber: updated.orderNumber,
      status: updated.status,
      estimatedDelivery: updated.estimatedDelivery,
      steps: updated.steps,
    }),
  );
});

export default router;
