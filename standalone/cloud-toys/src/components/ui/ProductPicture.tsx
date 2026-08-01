/**
 * ProductPicture — <picture> with AVIF + WebP sources, responsive srcset,
 * and a blur-up LQIP placeholder that fades out once the full image loads.
 *
 * For external URLs (seed / CDN images without stored variants) it falls back
 * to a plain <motion.img> so nothing breaks.
 *
 * Usage mirrors <motion.img>; all Framer Motion props land on the inner <img>.
 *
 *   <ProductPicture
 *     src={product.mediumUrl ?? product.imageUrl}
 *     avifSrcSet={`${product.thumbUrl} 300w, ${product.mediumUrl} 800w, ${product.largeUrl} 1600w`}
 *     sizes="(max-width: 640px) 50vw, 25vw"
 *     alt={product.imageAlt ?? product.name}
 *     lqip={product.lqip}
 *     animate={{ scale: hovered ? 1.06 : 1 }}
 *     transition={{ duration: 0.6 }}
 *     className="w-full h-full object-cover"
 *   />
 */

import { forwardRef, useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────

function isInternalUrl(url: string): boolean {
  return url.startsWith("/api/images/p/");
}

/** Replace every .avif occurrence with .webp in a URL or srcSet string. */
function avifToWebp(s: string): string {
  return s.replace(/\.avif\b/g, ".webp");
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductPictureProps extends HTMLMotionProps<"img"> {
  /** Primary src — AVIF for uploaded images, or an external URL. */
  src: string;
  /**
   * AVIF srcSet with width descriptors, e.g.
   * "/api/images/p/…/thumb.avif 300w, …/medium.avif 800w, …/large.avif 1600w"
   */
  avifSrcSet?: string;
  sizes?: string;
  alt: string;
  /**
   * Tiny 20×20 WebP base64 data URI used as a blurred placeholder while the
   * full image loads. Generated server-side and stored alongside the product.
   */
  lqip?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────

export const ProductPicture = forwardRef<HTMLImageElement, ProductPictureProps>(
  (
    { src, avifSrcSet, sizes, alt, lqip, onLoad, ...motionProps },
    ref,
  ) => {
    const [loaded, setLoaded] = useState(false);

    const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
      setLoaded(true);
      if (typeof onLoad === "function") onLoad(e);
    };

    const internal = isInternalUrl(src);
    const webpSrcSet = avifSrcSet ? avifToWebp(avifSrcSet) : undefined;
    // Fallback <img> src: WebP has ~97% support — better than AVIF as fallback
    const webpSrc = internal ? avifToWebp(src) : undefined;

    /**
     * Blurred LQIP overlay — absolutely positioned so it fills the parent
     * (which must have position:relative + overflow:hidden, as all product
     * image containers already do). Fades out once the full image is ready.
     */
    const placeholder = lqip ? (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${lqip})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // Blur radius large enough to hide the pixelation of a 20×20 image
          filter: "blur(24px)",
          // Slight scale prevents blurred edges from showing at the container border
          transform: "scale(1.08)",
          transition: "opacity 0.5s ease",
          opacity: loaded ? 0 : 1,
          pointerEvents: "none",
          // Sit below the real image in stacking order
          zIndex: 0,
        }}
      />
    ) : null;

    const imgEl = internal ? (
      <picture style={{ display: "contents" }}>
        {/* AVIF: best compression, ~93% global support */}
        {avifSrcSet && (
          <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
        )}
        {/* WebP: ~97% global support — fallback for non-AVIF browsers */}
        {webpSrcSet && (
          <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
        )}
        {/* Final <img> — browser chooses the best source above, or falls back here */}
        <motion.img
          ref={ref}
          src={webpSrc ?? src}
          alt={alt}
          onLoad={handleLoad}
          style={{ position: "relative", zIndex: 1 }}
          {...motionProps}
        />
      </picture>
    ) : (
      /* External URL — no format negotiation needed */
      <motion.img
        ref={ref}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        style={{ position: "relative", zIndex: 1 }}
        {...motionProps}
      />
    );

    // If there's no placeholder just return the image element directly
    if (!lqip) return imgEl;

    return (
      <>
        {placeholder}
        {imgEl}
      </>
    );
  },
);

ProductPicture.displayName = "ProductPicture";
