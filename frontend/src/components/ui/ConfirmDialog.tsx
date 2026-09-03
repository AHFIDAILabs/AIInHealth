import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Shared destructive-action confirmation — used for every delete/deactivate across
// the admin portal (Speakers, Sessions, Partners, Users) so the pattern is identical
// everywhere data loss is possible, per the Phase 1 checklist's Core UI States.
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${danger ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
            <AlertTriangle size={20} />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-navy">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
          <div className="mt-6 flex justify-end gap-2.5">
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-navy hover:bg-offwhite"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 ${
                danger ? 'bg-danger hover:opacity-90' : 'bg-orange hover:bg-orange-hover'
              }`}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
