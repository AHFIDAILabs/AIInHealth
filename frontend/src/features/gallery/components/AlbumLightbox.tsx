import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { RemoteImage } from '../../../design-system/primitives';
import type { RawPhotoEntry } from '../types';

interface AlbumLightboxProps {
  photos: RawPhotoEntry[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Flickr-specific lightbox — section 6.2 requires every displayed photo to
// link back to its own Flickr page and the view to carry the "Photos: ...
// on Flickr" credit, which the generic admin-media GalleryModal (features/
// gallery's sibling, serving the unrelated admin-uploaded Gallery page) has
// no reason to know about. Kept as its own component rather than bolting
// Flickr-only fields onto that one.
export const AlbumLightbox = ({ photos, activeIndex, onClose, onNavigate }: AlbumLightboxProps) => {
  const photo = activeIndex !== null ? photos[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && activeIndex > 0) onNavigate(activeIndex - 1);
      if (e.key === 'ArrowRight' && activeIndex < photos.length - 1) onNavigate(activeIndex + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, photos.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} />
          </button>

          {activeIndex! > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(activeIndex! - 1);
              }}
              aria-label="Previous"
              className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {activeIndex! < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(activeIndex! + 1);
              }}
              aria-label="Next"
              className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
            >
              <ChevronRight size={22} />
            </button>
          )}

          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-navy-nav shadow-2xl"
          >
            <div className="flex max-h-[70vh] items-center justify-center bg-black">
              <RemoteImage
                srcset={photo.srcset}
                fallbackUrl={photo.largeUrl}
                alt={photo.title}
                width={photo.width || 4}
                height={photo.height || 3}
                sizes="(min-width: 1024px) 768px, 100vw"
                loading="eager"
                className="max-h-[70vh] w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <p className="min-w-0 truncate text-sm leading-relaxed text-slate-200">{photo.title || 'AI in Health Summit 2026'}</p>
              <a
                href={photo.flickrPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                View on Flickr <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">Photos: AI in Health Summit 2026 on Flickr</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
