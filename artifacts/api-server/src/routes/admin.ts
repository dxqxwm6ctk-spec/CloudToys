import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
  reviewsTable,
  ordersTable,
  paymentMethodsTable,
  adminSettingsTable,
  newsletterSubscribersTable,
} from "@workspace/db";
import { deleteProductImageSet } from "./images";
import { buildSteps } from "../lib/orderStatus";
import { requireRole } from "../middleware/requireAdmin";
import * as z from "zod";
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

// ── Product helper ─────────────────────────────────────────────────────────

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
    | "stockQuantity"
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
    stockQuantity: row.stockQuantity,
    badge: row.badge as "new" | "bestseller" | "sale" | null,
    features: row.features,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Stats ──────────────────────────────────────────────────────────────────

// Supabase free-tier storage allowance (bytes). Update if the plan changes.
const SUPABASE_FREE_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GiB

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [productStats, categoryCount, orderCount, storageStats] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          inStock: sql<number>`count(*) filter (where ${productsTable.stockQuantity} > 0)`.mapWith(Number),
          outOfStock: sql<number>`count(*) filter (where ${productsTable.stockQuantity} <= 0)`.mapWith(Number),
        })
        .from(productsTable),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(categoriesTable),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(ordersTable),
      db.execute<{ bytes: string | null; file_count: string }>(
        sql`select sum((metadata->>'size')::bigint) as bytes, count(*) as file_count from storage.objects`,
      ),
    ]);

  const storageRow = storageStats.rows[0];

  res.json(
    GetAdminStatsResponse.parse({
      totalProducts: productStats[0].total,
      totalCategories: categoryCount[0].count,
      totalOrders: orderCount[0].count,
      inStockProducts: productStats[0].inStock,
      outOfStockProducts: productStats[0].outOfStock,
      storageUsedBytes: Number(storageRow?.bytes ?? 0),
      storageLimitBytes: SUPABASE_FREE_STORAGE_LIMIT_BYTES,
      storageFileCount: Number(storageRow?.file_count ?? 0),
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
        stockQuantity: productsTable.stockQuantity,
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

router.post("/admin/products", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    slug, name, shortDescription, description, price, compareAtPrice,
    currency, imageUrl, galleryUrls, thumbUrl, mediumUrl, largeUrl,
    categoryId, stockQuantity, badge, features,
  } = parsed.data;

  const numericCategoryId = Number(categoryId);
  if (!Number.isInteger(numericCategoryId) || numericCategoryId <= 0) {
    res.status(400).json({ error: "Please select a valid category." });
    return;
  }

  const [category] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, numericCategoryId));

  if (!category) {
    res.status(400).json({
      error: "The selected category no longer exists. Refresh the page and select a category again.",
    });
    return;
  }

  let inserted: { id: number };
  try {
    [inserted] = await db
      .insert(productsTable)
      .values({
        slug,
        name,
        shortDescription,
        description,
        price: String(price),
        compareAtPrice: compareAtPrice != null ? String(compareAtPrice) : null,
        currency: currency ?? "JOD",
        imageUrl,
        galleryUrls: galleryUrls ?? [],
        thumbUrl: thumbUrl ?? null,
        mediumUrl: mediumUrl ?? null,
        largeUrl: largeUrl ?? null,
        categoryId: numericCategoryId,
        stockQuantity,
        inStock: stockQuantity > 0,
        badge: badge ?? null,
        features: features ?? [],
      })
      // Do not use returning() without a projection here. The Supabase
      // database may be one schema revision behind the Drizzle model
      // (for example, before the optional Arabic columns were added), and
      // returning every model column would make an otherwise valid INSERT
      // fail with "column does not exist".
      .returning({ id: productsTable.id });
  } catch (error) {
    req.log.error(
      { err: error, slug, categoryId: numericCategoryId },
      "Failed to create product",
    );

    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "23505") {
      res.status(409).json({
        error: "A product with this slug already exists. Choose a different slug.",
      });
      return;
    }
    if (code === "23503") {
      res.status(400).json({
        error: "The selected category is invalid or no longer exists. Refresh the page and try again.",
      });
      return;
    }
    if (code === "42703" || code === "42P01") {
      res.status(500).json({
        error: "The Supabase database schema is missing a product field. Apply the latest database schema, then try again.",
      });
      return;
    }
    if (code === "22P02" || code === "22003" || code === "23514") {
      res.status(400).json({
        error: `Supabase rejected the product values${code ? ` (database error ${code})` : ""}. Check the price, stock quantity, and other fields.`,
      });
      return;
    }
    res.status(500).json({
      error: `Product could not be created in Supabase${code ? ` (database error ${code})` : ""}.`,
    });
    return;
  }

  let row: {
    id: number;
    slug: string;
    name: string;
    shortDescription: string;
    description: string;
    price: string;
    compareAtPrice: string | null;
    currency: string;
    imageUrl: string;
    galleryUrls: string[];
    thumbUrl: string | null;
    mediumUrl: string | null;
    largeUrl: string | null;
    lqip: string | null;
    imageAlt: string | null;
    categoryId: number;
    categoryName: string;
    rating: string;
    reviewCount: number;
    inStock: boolean;
    stockQuantity: number;
    badge: string | null;
    features: string[];
    createdAt: Date;
  } | undefined;
  try {
    [row] = await db
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
        stockQuantity: productsTable.stockQuantity,
        badge: productsTable.badge,
        features: productsTable.features,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.id, inserted.id));
  } catch (error) {
    req.log.error({ err: error, productId: inserted.id }, "Failed to load created product");
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    res.status(500).json({
      error: code === "42703" || code === "42P01"
        ? "The Supabase database schema is missing a product field. Apply the latest database schema, then try again."
        : `Product was saved, but its response could not be loaded from Supabase${code ? ` (database error ${code})` : ""}.`,
    });
    return;
  }

  if (!row) {
    res.status(500).json({ error: "Product was created but could not be loaded afterward." });
    return;
  }

  res.status(201).json(AdminCreateProductResponse.parse(toAdminProductDto(row)));
});

router.put("/admin/products/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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
  if (d.stockQuantity !== undefined) {
    updates.stockQuantity = d.stockQuantity;
    updates.inStock = d.stockQuantity > 0;
  }
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
      stockQuantity: productsTable.stockQuantity,
      badge: productsTable.badge,
      features: productsTable.features,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, updated.id));

  res.json(AdminUpdateProductResponse.parse(toAdminProductDto(row)));
});

router.delete("/admin/products/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const productId = Number(params.data.id);

  // Fetch image URLs before deleting so we can clean up storage
  const [product] = await db
    .select({ thumbUrl: productsTable.thumbUrl })
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Reviews reference this product with a NOT NULL foreign key — remove
      // them in the same transaction so a failed product delete cannot leave
      // the database half-updated.
      await tx.delete(reviewsTable).where(eq(reviewsTable.productId, productId));

      const deleted = await tx
        .delete(productsTable)
        .where(eq(productsTable.id, productId))
        .returning({ id: productsTable.id });

      if (deleted.length === 0) {
        throw new Error("Product was removed before the delete completed");
      }
    });
  } catch (error) {
    req.log.error({ err: error, productId }, "Failed to delete product");
    res.status(500).json({ error: "Product could not be deleted. Please try again." });
    return;
  }

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

router.post("/admin/categories", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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

router.put("/admin/categories/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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

router.delete("/admin/categories/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = AdminDeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const categoryId = Number(params.data.id);

  const [category] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, categoryId));

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  // Fetch all products in this category so we can clean up their images
  const products = await db
    .select({ id: productsTable.id, thumbUrl: productsTable.thumbUrl })
    .from(productsTable)
    .where(eq(productsTable.categoryId, categoryId));

  try {
    await db.transaction(async (tx) => {
      if (products.length > 0) {
        const productIds = products.map((p) => p.id);
        // Reviews reference products with a NOT NULL foreign key, so they
        // must be removed before the products in the same transaction.
        await tx
          .delete(reviewsTable)
          .where(inArray(reviewsTable.productId, productIds));
        await tx
          .delete(productsTable)
          .where(inArray(productsTable.id, productIds));
      }

      const deleted = await tx
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, categoryId))
        .returning({ id: categoriesTable.id });

      if (deleted.length === 0) {
        throw new Error("Category was removed before the delete completed");
      }
    });
  } catch (error) {
    req.log.error({ err: error, categoryId }, "Failed to delete category");
    res.status(500).json({ error: "Category could not be deleted. Please try again." });
    return;
  }

  // Storage cleanup happens only after the database transaction succeeds.
  for (const p of products) {
    deleteProductImageSet(p.thumbUrl).catch(() => {});
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
        customerName: o.customerName ?? null,
        customerPhone: o.customerPhone ?? null,
        paymentMethod: o.paymentMethod ?? null,
        shippingAddress: o.shippingAddress ?? null,
        shippingFee: o.shippingFee !== null && o.shippingFee !== undefined ? Number(o.shippingFee) : null,
        total: o.total !== null && o.total !== undefined ? Number(o.total) : null,
        items: o.items ?? null,
        createdAt: o.createdAt?.toISOString() ?? null,
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

  // Fetch current order to get existing steps
  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, Number(params.data.id)));

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const newSteps = buildSteps(existing.steps, body.data.status);

  const updates: Record<string, unknown> = { status: body.data.status, steps: newSteps };
  if (body.data.estimatedDelivery !== undefined) {
    updates.estimatedDelivery = body.data.estimatedDelivery;
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
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
      customerName: updated.customerName ?? null,
      customerPhone: updated.customerPhone ?? null,
      paymentMethod: updated.paymentMethod ?? null,
      createdAt: updated.createdAt?.toISOString() ?? null,
    }),
  );
});

// ── Admin Settings (free shipping threshold) ───────────────────────────────
//
// JOD is the store's base currency — prices are entered and shown as-is,
// with no exchange-rate conversion applied anywhere. The "currency" field
// here is a display label only (which symbol/code appears next to the
// amount); it is never converted against the cart's JOD-denominated total.

const SHIPPING_THRESHOLD_KEY = "free_shipping_threshold";
const DEFAULT_SHIPPING_THRESHOLD = { amount: 150, currency: "USD" as const };

const ShippingThresholdBody = z.object({
  amount: z.coerce.number().min(0),
  currency: z.enum(["JOD", "USD"]),
});

router.get("/admin/settings/shipping", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, SHIPPING_THRESHOLD_KEY));
  if (!row) {
    res.json(DEFAULT_SHIPPING_THRESHOLD);
    return;
  }
  try {
    res.json({ ...DEFAULT_SHIPPING_THRESHOLD, ...JSON.parse(row.value) });
  } catch {
    res.json(DEFAULT_SHIPPING_THRESHOLD);
  }
});

router.put("/admin/settings/shipping", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ShippingThresholdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const value = JSON.stringify(parsed.data);
  await db
    .insert(adminSettingsTable)
    .values({ key: SHIPPING_THRESHOLD_KEY, value })
    .onConflictDoUpdate({
      target: adminSettingsTable.key,
      set: { value },
    });
  res.json(parsed.data);
});

// ── Admin Settings (return policy) ─────────────────────────────────────────

const RETURN_POLICY_KEY = "return_policy";
const DEFAULT_RETURN_POLICY = { enabled: true, days: 30 };

const ReturnPolicyBody = z.object({
  enabled: z.boolean(),
  days: z.coerce.number().int().min(1).max(365),
});

router.get("/admin/settings/returns", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, RETURN_POLICY_KEY));
  if (!row) {
    res.json(DEFAULT_RETURN_POLICY);
    return;
  }
  try {
    res.json({ ...DEFAULT_RETURN_POLICY, ...JSON.parse(row.value) });
  } catch {
    res.json(DEFAULT_RETURN_POLICY);
  }
});

router.put("/admin/settings/returns", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ReturnPolicyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const value = JSON.stringify(parsed.data);
  await db
    .insert(adminSettingsTable)
    .values({ key: RETURN_POLICY_KEY, value })
    .onConflictDoUpdate({
      target: adminSettingsTable.key,
      set: { value },
    });
  res.json(parsed.data);
});

// ── Admin Settings (warranty policy) ───────────────────────────────────────

const WARRANTY_POLICY_KEY = "warranty_policy";
const DEFAULT_WARRANTY_POLICY = { enabled: true, duration: 2, unit: "years" as const };

const WarrantyPolicyBody = z.object({
  enabled: z.boolean(),
  duration: z.coerce.number().int().min(1).max(120),
  unit: z.enum(["months", "years"]),
});

router.get("/admin/settings/warranty", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, WARRANTY_POLICY_KEY));
  if (!row) {
    res.json(DEFAULT_WARRANTY_POLICY);
    return;
  }
  try {
    res.json({ ...DEFAULT_WARRANTY_POLICY, ...JSON.parse(row.value) });
  } catch {
    res.json(DEFAULT_WARRANTY_POLICY);
  }
});

router.put("/admin/settings/warranty", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = WarrantyPolicyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const value = JSON.stringify(parsed.data);
  await db
    .insert(adminSettingsTable)
    .values({ key: WARRANTY_POLICY_KEY, value })
    .onConflictDoUpdate({
      target: adminSettingsTable.key,
      set: { value },
    });
  res.json(parsed.data);
});

// ── Admin Settings (default delivery duration) ────────────────────────────

const DELIVERY_DAYS_KEY = "default_delivery_days";
const DEFAULT_DELIVERY_DAYS = 7;

router.get("/admin/settings/delivery", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, DELIVERY_DAYS_KEY));
  const days = row ? Number(row.value) : DEFAULT_DELIVERY_DAYS;
  res.json({ days: Number.isFinite(days) && days > 0 ? days : DEFAULT_DELIVERY_DAYS });
});

router.put("/admin/settings/delivery", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = z.object({ days: z.coerce.number().int().min(1).max(90) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .insert(adminSettingsTable)
    .values({ key: DELIVERY_DAYS_KEY, value: String(parsed.data.days) })
    .onConflictDoUpdate({
      target: adminSettingsTable.key,
      set: { value: String(parsed.data.days) },
    });
  res.json({ days: parsed.data.days });
});

// ── Admin Settings (contact info) ──────────────────────────────────────────

const CONTACT_INFO_KEY = "contact_info";
const DEFAULT_CONTACT_INFO = {
  email: "Alhasanfarg3@gmail.com",
  phone: "+962770600234",
  address: "Amman, Jordan",
};

router.get("/admin/settings/contact", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, CONTACT_INFO_KEY));
  if (!row) {
    res.json(DEFAULT_CONTACT_INFO);
    return;
  }
  try {
    res.json({ ...DEFAULT_CONTACT_INFO, ...JSON.parse(row.value) });
  } catch {
    res.json(DEFAULT_CONTACT_INFO);
  }
});

const AdminUpdateContactInfoBody = z.object({
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
});

router.put("/admin/settings/contact", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = AdminUpdateContactInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const value = JSON.stringify(parsed.data);
  await db
    .insert(adminSettingsTable)
    .values({ key: CONTACT_INFO_KEY, value })
    .onConflictDoUpdate({
      target: adminSettingsTable.key,
      set: { value },
    });
  res.json(parsed.data);
});

// ── Payment Methods (admin) ────────────────────────────────────────────────

router.get("/admin/settings/payment-methods", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .orderBy(paymentMethodsTable.id);

  res.json(
    rows.map((m) => ({
      id: String(m.id),
      key: m.key,
      label: m.label,
      description: m.description ?? null,
      enabled: m.enabled,
    })),
  );
});

const AdminUpdatePaymentMethodParams = z.object({ id: z.coerce.number() });
const AdminUpdatePaymentMethodBody = z.object({ enabled: z.boolean() });

router.put("/admin/settings/payment-methods/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = AdminUpdatePaymentMethodParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminUpdatePaymentMethodBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(paymentMethodsTable)
    .set({ enabled: body.data.enabled })
    .where(eq(paymentMethodsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Payment method not found" });
    return;
  }

  res.json({
    id: String(updated.id),
    key: updated.key,
    label: updated.label,
    description: updated.description ?? null,
    enabled: updated.enabled,
  });
});

// ── Newsletter subscribers (admin) ──────────────────────────────────────────

router.get("/admin/newsletter/subscribers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.subscribedAt));

  res.json(
    rows.map((s) => ({
      id: String(s.id),
      email: s.email,
      subscribedAt: s.subscribedAt.toISOString(),
    })),
  );
});

router.get("/admin/newsletter/subscribers/export", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.subscribedAt));

  const escapeCsv = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const csv = [
    "email,subscribed_at",
    ...rows.map(
      (s) => `${escapeCsv(s.email)},${s.subscribedAt.toISOString()}`,
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="newsletter-subscribers.csv"',
  );
  res.send(csv);
});

const AdminDeleteNewsletterSubscriberParams = z.object({ id: z.coerce.number() });

router.delete("/admin/newsletter/subscribers/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = AdminDeleteNewsletterSubscriberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.id, params.data.id));

  res.status(204).end();
});

export default router;
