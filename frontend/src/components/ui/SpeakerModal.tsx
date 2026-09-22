import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { InitialsAvatar } from './InitialsAvatar';
import { ButtonLink } from './Button';
import type { AdminSpeaker } from '../../services/speaker.service';

interface SpeakerModalProps {
  speaker: AdminSpeaker | null;
  onClose: () => void;
}

// Shared full-detail overlay for a speaker — used by both the dedicated /speakers
// grid and the Home page's Confirmed Voices strip, so the two never drift apart.
// Backed by the real GET /speakers data, so organization/bio show up whenever
// they're actually filled in (unlike the old static roster, which never had them).
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
          className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-2xl max-h-[90vh]"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-sm hover:bg-navy/80"
          >
            <X size={18} />
          </button>

          {/* Row header — photo left, name/title right — same treatment as
              the abstract showcase modal. The photo band is a fixed height,
              independent of how long the bio underneath runs: the old
              layout let the image column stretch to match the text
              column's height, so a long bio produced a very tall, narrow
              photo panel that object-cover cropped down to a sliver. */}
          <div className="flex h-64 w-full overflow-hidden rounded-t-2xl sm:h-72">
            <div className="relative h-full w-2/5 shrink-0 overflow-hidden bg-navy-secondary">
              {speaker.photoUrl ? (
                <img src={speaker.photoUrl} alt={speaker.fullName} className="h-full w-full object-cover object-top" />
              ) : (
                <InitialsAvatar name={speaker.fullName} className="h-full w-full rounded-none" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center overflow-hidden p-5 text-left sm:p-7">
              <span className="inline-block w-fit rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange">
                {speaker.track}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-navy sm:text-xl">{speaker.fullName}</h3>
              <p className="mt-1 text-sm leading-snug text-slate-600">{speaker.title}</p>
              {speaker.organization && <p className="mt-0.5 text-sm text-slate-500">{speaker.organization}</p>}
            </div>
          </div>

          <div className="p-6 sm:p-7">
            {speaker.bio && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{speaker.bio}</p>}
            <ButtonLink to="/agenda" variant="primary" className="!mt-6 !py-2.5 !text-sm">
              View Related Sessions
            </ButtonLink>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
