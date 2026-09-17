import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// A secondary, always-on conversion surface distinct from the navbar's own CTA —
// stays pinned to the viewport as the page grows longer with this upgrade (mega-menu,
// two newsletter captures, a press-quote band...), so registering is never more than
// a thumb's reach away, however far a visitor has scrolled. Dismissible per session.
export const FloatingCTA = () => {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.3, delay: 1.2 }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1 rounded-full bg-navy py-1.5 pl-4 pr-1.5 shadow-xl shadow-navy/25 ring-1 ring-white/10"
        >
          <Link
            to="/register"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white transition-colors hover:text-orange"
          >
            Register Interest <ArrowRight size={14} />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
