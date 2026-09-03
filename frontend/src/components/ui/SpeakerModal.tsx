import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { InitialsAvatar } from './InitialsAvatar';
import { ButtonLink } from './Button';
import type { Speaker } from '../../lib/speakers';

interface SpeakerModalProps {
  speaker: Speaker | null;
  onClose: () => void;
}

// Shared full-detail overlay for a speaker — used by both the dedicated /speakers
// grid and the Home page's Confirmed Voices strip, so the two never drift apart.
// Only shows fields that actually exist on the data (name/title/track/photo) —
// no bio field exists in lib/speakers.ts, so none is invented here.
export const SpeakerModal = ({ speaker, onClose }: SpeakerModalProps) => (
  <AnimatePresence>
    {speaker && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="grid w-full max-w-lg grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-2xl sm:grid-cols-2"
        >
          <div className="relative aspect-[4/3] sm:aspect-auto">
            {speaker.photo ? (
              <img src={speaker.photo} alt={speaker.name} className="h-full w-full object-cover" />
            ) : (
              <InitialsAvatar name={speaker.name} className="h-full w-full" />
            )}
          </div>
          <div className="relative p-6 sm:p-7">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
            >
              <X size={18} />
            </button>
            <span className="inline-block rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange">
              {speaker.track}
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold text-navy">{speaker.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{speaker.title}</p>
            <ButtonLink to="/agenda" variant="primary" className="!mt-6 !py-2.5 !text-sm">
              View Related Sessions
            </ButtonLink>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
