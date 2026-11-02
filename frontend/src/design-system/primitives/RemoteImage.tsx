import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface RemoteImageSrcsetEntry {
  width: number;
  url: string;
}

interface RemoteImageProps {
  srcset: RemoteImageSrcsetEntry[];
  fallbackUrl: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

// Section 6.2's single responsive-image entry point — srcset from Flickr's
// size variants, lazy loading, explicit width/height (no layout shift), a
// neutral placeholder while loading, and a broken-image fallback. Never
// requests a size larger than the breakpoint actually needs.
export const RemoteImage = ({ srcset, fallbackUrl, alt, width, height, className = '', sizes, loading = 'lazy' }: RemoteImageProps) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <ImageOff size={24} />
      </div>
    );
  }

  const srcSetAttr = srcset.length > 0 ? srcset.map((s) => `${s.url} ${s.width}w`).join(', ') : undefined;

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" aria-hidden="true" />}
      <img
        src={fallbackUrl}
        srcSet={srcSetAttr}
        sizes={sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
