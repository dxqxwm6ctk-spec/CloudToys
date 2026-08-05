/**
 * Image management routes — upload, process, serve
 *
 * POST /admin/images/upload   — accept multipart, process with Sharp, store in Supabase Storage
 * GET  /images/p/:key         — serve processed AVIF/WebP with immutable cache headers
 */
import path from "path";
import { randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import { uploadFile, fileExists, downloadFile, deleteByPrefix } from "../lib/supabaseStorage";
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

// ── Router ─────────────────────────────────────────────────────────────────

const router: IRouter = Router();

// POST /admin/images/upload
router.post(
  "/admin/images/upload",
  requireRole("admin", "manager"),
  uploadRateLimit,
  upload.single("file"),
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
      res.status(500).json({ error: "Image processing failed" });
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
