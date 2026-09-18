import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Share2, Link2, Check } from 'lucide-react';
import type { AdminMedia, MediaDay } from '../../services/media.service';

const DAY_LABEL: Record<MediaDay, string> = { day1: 'Day 1', day2: 'Day 2', general: 'General' };

interface GalleryModalProps {
  items: AdminMedia[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Full-screen lightbox for the public Gallery — image or video, caption, and
// prev/next through whichever filtered set (All/Photos/Videos) is currently shown.
export const GalleryModal = ({ items, activeIndex, onClose, onNavigate }: GalleryModalProps) => {
  const [copied, setCopied] = useState(false);
  const item = activeIndex !== null ? items[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && activeIndex > 0) onNavigate(activeIndex - 1);
      if (e.key === 'ArrowRight' && activeIndex < items.length - 1) onNavigate(activeIndex + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, items.length, onClose, onNavigate]);

  const canNativeShare = typeof navigator.share === 'function';

  const share = async () => {
    if (!item) return;
    if (canNativeShare) {
      navigator.share({ title: item.caption || 'AI in Health Summit 2026', url: item.url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
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
          {activeIndex! < items.length - 1 && (
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
            key={item._id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-navy-nav shadow-2xl"
          >
            <div className="flex max-h-[70vh] items-center justify-center bg-black">
              {item.type === 'video' ? (
                <video src={item.url} poster={item.thumbnailUrl} controls autoPlay className="max-h-[70vh] w-full" />
              ) : (
                <img src={item.url} alt={item.caption || ''} className="max-h-[70vh] w-full object-contain" />
              )}
            </div>
            {(item.caption || true) && (
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  {(item.day !== 'general' || item.momentLabel) && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">
                      {item.day !== 'general' ? DAY_LABEL[item.day] : ''}
                      {item.day !== 'general' && item.momentLabel ? ' · ' : ''}
                      {item.momentLabel}
                    </p>
                  )}
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-200">{item.caption || 'AI in Health Summit 2026'}</p>
                </div>
                <button
                  onClick={share}
                  title="Share"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {copied ? <Check size={13} /> : canNativeShare ? <Share2 size={13} /> : <Link2 size={13} />}
                  {copied ? 'Copied' : 'Share'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
