import React, { useState } from 'react';
import { Package } from 'lucide-react';

/**
 * Normalize stored product image paths for <img src>.
 * Supports absolute URLs, `/uploads/...`, and bare `uploads/...`.
 */
export function resolveProductImageUrl(image) {
  if (!image || typeof image !== 'string') return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  return trimmed;
}

/**
 * Product thumbnail / hero image with package icon fallback when missing or broken.
 */
export default function ProductImage({
  src,
  alt = 'Product',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  iconClassName = 'w-8 h-8 text-slate-300',
  rounded = 'rounded-lg'
}) {
  const [failed, setFailed] = useState(false);
  const url = resolveProductImageUrl(src);

  if (!url || failed) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center ${rounded} ${className}`}
        aria-label={alt}
      >
        <Package className={iconClassName} />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-slate-100 ${rounded} ${className}`}>
      <img
        src={url}
        alt={alt}
        className={imgClassName}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
