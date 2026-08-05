import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

/**
 * Small icon-button pair next to an order number: copy to clipboard, and
 * share via the native share sheet on devices that support it. Falls back
 * to clipboard-only where `navigator.share` isn't available (most desktop
 * browsers).
 */
export function CopyOrderNumber({ orderNumber, className = '' }: { orderNumber: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing else we can do silently.
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/track-order?number=${encodeURIComponent(orderNumber)}`;
    try {
      if (canShare) {
        await navigator.share({
          title: `Order ${orderNumber}`,
          text: `Track my Cloud Toys order: ${orderNumber}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // User cancelled the share sheet or clipboard failed — ignore.
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy order number"
        aria-label="Copy order number"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={handleShare}
        title={canShare ? 'Share order' : 'Copy trackable link'}
        aria-label="Share order"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
