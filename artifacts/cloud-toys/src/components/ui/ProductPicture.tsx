/**
 * ProductPicture — renders a <picture> element with AVIF + WebP sources when the
 * image is one of our internally-stored variants (/api/images/p/…).
 *
 * For external URLs (e.g. seed data pointing to external CDNs) it falls back to
 * a plain <img> so the browser still loads the image normally.
 *
 * Usage mirrors a regular <img>; pass className / animate / transition props and
 * they land on the inner <img> (or motion.img) element so Framer Motion works.
 */

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────

/** True when the URL points to our image-serving endpoint. */
function isInternalImageUrl(url: string): boolean {
  return url.startsWith("/api/images/p/");
}

/** Swap the .avif extension for .webp in an AVIF URL or srcSet string. */
function avifToWebp(s: string): string {
  return s.replace(/\.avif\b/g, ".webp");
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductPictureProps extends HTMLMotionProps<"img"> {
  /** Primary image URL — AVIF for uploaded images, or an external URL. */
  src: string;
  /** AVIF srcSet string produced by the upload pipeline. */
  avifSrcSet?: string;
  sizes?: string;
  alt: string;
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for <motion.img> that adds AVIF + WebP <source> entries
 * when the image is an internally-stored AVIF variant.
 *
 *   <ProductPicture
 *     src={product.mediumUrl ?? product.imageUrl}
 *     avifSrcSet={`${product.thumbUrl} 300w, ${product.mediumUrl} 800w, ${product.largeUrl} 1600w`}
 *     sizes="(max-width: 640px) 50vw, 25vw"
 *     alt={product.name}
 *     animate={{ scale: hovered ? 1.06 : 1 }}
 *     transition={{ duration: 0.6 }}
 *     className="w-full h-full object-cover"
 *   />
 */
export const ProductPicture = forwardRef<HTMLImageElement, ProductPictureProps>(
  ({ src, avifSrcSet, sizes, alt, ...motionProps }, ref) => {
    const internal = isInternalImageUrl(src);

    // Derive WebP equivalents by swapping the extension
    const webpSrcSet = avifSrcSet ? avifToWebp(avifSrcSet) : undefined;
    const webpSrc = internal ? avifToWebp(src) : undefined;

    if (!internal) {
      // External URL — no format negotiation needed
      return <motion.img ref={ref} src={src} alt={alt} {...motionProps} />;
    }

    return (
      <picture>
        {/* AVIF: best compression, ~93 % browser support */}
        <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
        {/* WebP: good compression, ~97 % browser support */}
        {webpSrcSet && (
          <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
        )}
        {/* Fallback <img> — uses WebP URL which has near-universal support */}
        <motion.img
          ref={ref}
          src={webpSrc ?? src}
          alt={alt}
          {...motionProps}
        />
      </picture>
    );
  },
);

ProductPicture.displayName = "ProductPicture";
