/**
 * Image management routes — upload, process, serve
 *
 * POST /admin/images/upload   — accept multipart, process with Sharp, store in Supabase Storage
 * GET  /images/p/:key         — serve processed AVIF/WebP with immutable cache headers
 */
import path from "path";
import { randomUUID } from "crypto";
import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import {
  uploadFile,
  fileExists,
  downloadFile,
  deleteByPrefix,
  isImageStorageConfigured,
  listImageObjects,
} from "../lib/supabaseStorage";
import { requireRole } from "../middleware/requireAdmin";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/avif",
]);

const ALLOWED_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".gif",
  ".avif",
]);

const SIZES: Array<{ name: "thumb" | "medium" | "large"; px: number }> = [
  { name: "thumb", px: 300 },
  { name: "medium", px: 800 },
  { name: "large", px: 1600 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function imageObjectPath(productId: string, uuid: string, size: string, ext: "avif" | "webp"): string {
  return `products/${productId}/${uuid}/${size}.${ext}`;
}

function imageServingUrl(productId: string, uuid: string, size: string): string {
  return `/api/images/p/${productId}/${uuid}/${size}.avif`;
}

/**
 * Parse productId and uuid from an internal image URL.
 * Returns null for external URLs.
 */
function parseInternalImageUrl(url: string): { productId: string; uuid: string } | null {
  const match = url.match(/^\/api\/images\/p\/([a-zA-Z0-9_-]+)\/([0-9a-f-]{36})\//);
  if (!match) return null;
  return { productId: match[1], uuid: match[2] };
}

function parseStorageImagePath(value: string): { productId: string; uuid: string } | null {
  const match = value.match(
    /^products\/([a-zA-Z0-9_-]+)\/([0-9a-f-]{36})(?:\/(?:thumb|medium|large)\.(?:avif|webp))?$/,
  );
  return match ? { productId: match[1], uuid: match[2] } : null;
}

type ImageGroup = {
  path: string;
  name: string;
  size: number;
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publicUrl: string;
  variantCount: number;
  used: boolean;
  products: Array<{ id: string; name: string }>;
};

/**
 * Delete all stored image files (AVIF + WebP, all sizes) for a product image set.
 * Identified by any one of the variant URLs (e.g. thumbUrl).
 * Safe to call with null/undefined or external URLs — does nothing in those cases.
 * Never throws; failures are logged and swallowed so callers need not worry.
 */
export async function deleteProductImageSet(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const parsed = parseInternalImageUrl(imageUrl);
  if (!parsed) return; // external URL — nothing stored by us
  const { productId, uuid } = parsed;
  try {
    await deleteByPrefix(`products/${productId}/${uuid}/`);
  } catch (err) {
    console.error("[images] deleteProductImageSet failed:", err);
  }
}

async function processAndUpload(
  buffer: Buffer,
  productId: string,
  uuid: string,
): Promise<{ thumbUrl: string; mediumUrl: string; largeUrl: string; lqip: string }> {
  // Generate AVIF variants, WebP variants, and a tiny LQIP in parallel
  const [avifBuffers, webpBuffers, lqipBuffer] = await Promise.all([
    Promise.all(
      SIZES.map(({ px }) =>
        sharp(buffer)
          .rotate() // auto-rotate from EXIF
          .resize(px, px, { fit: "inside", withoutEnlargement: true })
          .avif({ quality: 60, effort: 6 })
          .toBuffer(),
      ),
    ),
    Promise.all(
      SIZES.map(({ px }) =>
        sharp(buffer)
          .rotate()
          .resize(px, px, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer(),
      ),
    ),
    // LQIP: 20×20 WebP at very low quality → base64 data URI (~300–600 bytes)
    sharp(buffer)
      .rotate()
      .resize(20, 20, { fit: "cover" })
      .webp({ quality: 20 })
      .toBuffer(),
  ]);

  const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

  // Upload all 6 files (3 sizes × 2 formats) in parallel
  await Promise.all([
    ...SIZES.map(({ name }, i) =>
      uploadFile(imageObjectPath(productId, uuid, name, "avif"), avifBuffers[i], "image/avif"),
    ),
    ...SIZES.map(({ name }, i) =>
      uploadFile(imageObjectPath(productId, uuid, name, "webp"), webpBuffers[i], "image/webp"),
    ),
  ]);

  return {
    thumbUrl: imageServingUrl(productId, uuid, "thumb"),
    mediumUrl: imageServingUrl(productId, uuid, "medium"),
    largeUrl: imageServingUrl(productId, uuid, "large"),
    lqip,
  };
}

// ── Middleware ─────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
      cb(new Error(`Unsupported file type: ${file.mimetype} / ${ext}`));
      return;
    }
    cb(null, true);
  },
});

const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: "Too many uploads, slow down" },
});

// Multer errors happen before the route handler runs. Convert them to the
// same JSON shape used by the handler so the admin UI can show the real cause
// (unsupported format or file too large) instead of a generic HTML 500 page.
const uploadSingleFile: RequestHandler = (req, res, next): void => {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Image is too large. Maximum size is 10 MB." });
        return;
      }
      res.status(400).json({ error: `Image upload failed: ${err.message}` });
      return;
    }

    const message = err instanceof Error ? err.message : "Unsupported image file";
    res.status(400).json({ error: message });
  });
};

// ── Router ─────────────────────────────────────────────────────────────────

const router: IRouter = Router();

// GET /admin/images — list one item per uploaded image group and annotate usage
router.get("/admin/images", async (req, res): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const storedObjects = await listImageObjects();
    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        imageUrl: productsTable.imageUrl,
        galleryUrls: productsTable.galleryUrls,
        thumbUrl: productsTable.thumbUrl,
        mediumUrl: productsTable.mediumUrl,
        largeUrl: productsTable.largeUrl,
      })
      .from(productsTable);

    const productGroups = new Map<string, Array<{ id: string; name: string }>>();
    for (const product of products) {
      const urls = [
        product.imageUrl,
        ...(product.galleryUrls ?? []),
        product.thumbUrl,
        product.mediumUrl,
        product.largeUrl,
      ].filter((url): url is string => Boolean(url));
      const groupKeys = new Set(
        urls
          .map(parseInternalImageUrl)
          .filter((parsed): parsed is { productId: string; uuid: string } => Boolean(parsed))
          .map((parsed) => `products/${parsed.productId}/${parsed.uuid}`),
      );
      for (const key of groupKeys) {
        const existing = productGroups.get(key) ?? [];
        existing.push({ id: String(product.id), name: product.name });
        productGroups.set(key, existing);
      }
    }

    const groups = new Map<string, ImageGroup>();
    for (const object of storedObjects) {
      const parsed = parseStorageImagePath(object.path);
      const groupPath = parsed
        ? `products/${parsed.productId}/${parsed.uuid}`
        : object.path;
      const existing = groups.get(groupPath);
      if (existing) {
        existing.size += object.size;
        existing.variantCount += 1;
        existing.createdAt =
          existing.createdAt && object.createdAt
            ? new Date(existing.createdAt) < new Date(object.createdAt)
              ? existing.createdAt
              : object.createdAt
            : existing.createdAt ?? object.createdAt;
        existing.updatedAt =
          existing.updatedAt && object.updatedAt
            ? new Date(existing.updatedAt) > new Date(object.updatedAt)
              ? existing.updatedAt
              : object.updatedAt
            : existing.updatedAt ?? object.updatedAt;
        if (object.path.endsWith("/medium.avif") || object.path.endsWith("/thumb.avif")) {
          existing.publicUrl = object.publicUrl;
          existing.mimeType = object.mimeType;
        }
        continue;
      }

      const usedProducts = productGroups.get(groupPath) ?? [];
      groups.set(groupPath, {
        path: groupPath,
        name: parsed?.uuid ?? object.name,
        size: object.size,
        mimeType: object.mimeType,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        publicUrl: object.publicUrl,
        variantCount: 1,
        used: usedProducts.length > 0,
        products: usedProducts,
      });
    }

    const items = [...groups.values()]
      .filter((item) => !search || `${item.path} ${item.name} ${item.products.map((p) => p.name).join(" ")}`
        .toLowerCase()
        .includes(search))
      .sort((a, b) => a.path.localeCompare(b.path));
    res.json({ items, total: items.length });
  } catch (err) {
    req.log.error({ err }, "Image listing failed");
    res.status(500).json({ error: "Failed to list stored images" });
  }
});

// DELETE /admin/images?path=... — delete all variants in one image group
router.delete(
  "/admin/images",
  requireRole("admin", "manager"),
  async (req, res): Promise<void> => {
    const objectPath = typeof req.query.path === "string" ? req.query.path : "";
    const segments = objectPath.split("/");
    if (
      !objectPath ||
      objectPath.startsWith("/") ||
      objectPath.includes("\\") ||
      segments.some((segment) => segment === ".." || segment === ".") ||
      segments.some((segment) => segment.length === 0)
    ) {
      res.status(400).json({ error: "Invalid storage path" });
      return;
    }

    try {
      const parsed = parseStorageImagePath(objectPath);
      if (!parsed) {
        res.status(400).json({ error: "Invalid image group path" });
        return;
      }

      const usageRows = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          imageUrl: productsTable.imageUrl,
          galleryUrls: productsTable.galleryUrls,
          thumbUrl: productsTable.thumbUrl,
          mediumUrl: productsTable.mediumUrl,
          largeUrl: productsTable.largeUrl,
        })
        .from(productsTable);
      const usedBy = usageRows.filter((product) => {
        const urls = [
          product.imageUrl,
          ...(product.galleryUrls ?? []),
          product.thumbUrl,
          product.mediumUrl,
          product.largeUrl,
        ].filter((url): url is string => Boolean(url));
        return urls.some((url) => {
          const referenced = parseInternalImageUrl(url);
          return referenced?.productId === parsed.productId && referenced.uuid === parsed.uuid;
        });
      });

      const confirmUsed = req.query.confirmUsed === "true";
      if (usedBy.length > 0 && !confirmUsed) {
        res.status(409).json({
          error: `This image is currently used by ${usedBy.map((product) => product.name).join(", ")}. Confirm deletion to remove it from storage.`,
          usedBy: usedBy.map((product) => ({ id: String(product.id), name: product.name })),
        });
        return;
      }

      const objectPaths = (await listImageObjects())
        .filter((item) => item.path.startsWith(`${objectPath}/`))
        .map((item) => item.path);
      if (objectPaths.length > 0) {
        await deleteByPrefix(`${objectPath}/`);
      }
      res.json({ success: true, path: objectPath, deletedCount: objectPaths.length });
    } catch (err) {
      req.log.error({ err, objectPath }, "Image deletion failed");
      res.status(500).json({ error: "Failed to delete stored image" });
    }
  },
);

// POST /admin/images/upload
router.post(
  "/admin/images/upload",
  requireRole("admin", "manager"),
  uploadRateLimit,
  uploadSingleFile,
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const productId = String(req.body?.productId || "unassigned");

    // Prevent directory traversal in productId
    if (!/^[a-zA-Z0-9_-]+$/.test(productId)) {
      res.status(400).json({ error: "Invalid productId" });
      return;
    }

    const uuid = randomUUID();
    const originalFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    try {
      const urls = await processAndUpload(req.file.buffer, productId, uuid);

      // If a real productId was provided, update the product record
      const numId = Number(productId);
      if (!Number.isNaN(numId)) {
        await db
          .update(productsTable)
          .set({
            thumbUrl: urls.thumbUrl,
            mediumUrl: urls.mediumUrl,
            largeUrl: urls.largeUrl,
            lqip: urls.lqip,
            originalImageFilename: originalFilename,
            imageAlt: req.body?.altText ?? null,
          })
          .where(eq(productsTable.id, numId));
      }

      res.status(201).json({
        ...urls,
        originalFilename,
        uuid,
      });
    } catch (err) {
      req.log.error({ err }, "Image processing failed");
      const message = err instanceof Error ? err.message : "Unknown image upload error";
      const isStorageConfigError = /Image storage is not configured/.test(message);
      res.status(isStorageConfigError ? 503 : 500).json({
        error: isStorageConfigError
          ? `${message} Add the missing Supabase secret to the API deployment and restart it.`
          : "Image processing failed. Check that the file is a supported image under 10 MB.",
      });
    }
  },
);

// GET /images/p/:productId/:uuid/:size  — serve AVIF or WebP with immutable headers
// :size examples: "thumb.avif", "medium.webp", "large.avif"
router.get("/images/p/:productId/:uuid/:size", async (req, res): Promise<void> => {
  const { productId, uuid, size } = req.params;

  const isWebp = size.endsWith(".webp");
  const isAvif = size.endsWith(".avif");
  const sizeName = size.replace(/\.(avif|webp)$/, "");

  // Basic sanitization — prevent directory traversal
  if (
    !/^[a-zA-Z0-9_-]+$/.test(productId) ||
    !/^[0-9a-f-]{36}$/.test(uuid) ||
    !["thumb", "medium", "large"].includes(sizeName) ||
    (!isAvif && !isWebp)
  ) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const ext = isWebp ? "webp" : "avif";
  const contentType = isWebp ? "image/webp" : "image/avif";
  const objectPath = imageObjectPath(productId, uuid, sizeName, ext);

  if (!isImageStorageConfigured()) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  try {
    const exists = await fileExists(objectPath);
    if (!exists) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const buffer = await downloadFile(objectPath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Vary", "Accept-Encoding");

    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Image serve failed");
    res.status(500).json({ error: "Failed to serve image" });
  }
});

export default router;
