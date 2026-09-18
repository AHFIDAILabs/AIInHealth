import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { LightField } from './LightField';
import { Button } from './Button';
import { submitSessionRsvp } from '../../services/session.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

interface SessionRsvpModalProps {
  session: { _id: string; title: string } | null;
  onClose: () => void;
}

// Public RSVP check/claim for a limited-capacity session — overlay structure
// copied from SpeakerModal.tsx (same backdrop/card/close-button convention), but
// single-column and form-shaped like VolunteerForm.tsx's one-field pattern. A
// submit either confirms an existing entry, claims a new one if there's still
// room and the email belongs to a confirmed registrant, or reports why not
// (full, or not a registered attendee) — see session.controller.ts's publicRsvp.
export const SessionRsvpModal = ({ session, onClose }: SessionRsvpModalProps) => {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const close = () => {
    onClose();
    // Reset after the exit animation finishes rather than instantly, so the
    // success/full message doesn't visibly flash back to the form mid-close.
    setTimeout(() => {
      reset();
      setResult(null);
    }, 200);
  };

  const onSubmit = async (values: FormValues) => {
    if (!session) return;
    try {
      const { message } = await submitSessionRsvp(session._id, values.email);
      setResult({ ok: true, message });
    } catch (err) {
      setResult({ ok: false, message: getApiErrorMessage(err, "That didn't work. Please try again.") });
    }
  };

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
            >
              <X size={18} />
            </button>

            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange/10 text-orange">
              <CalendarCheck size={20} />
            </span>
            <h3 className="mt-3.5 font-display text-lg font-semibold text-navy">RSVP</h3>
            <p className="mt-1 text-sm text-slate-500">{session.title}</p>

            {result ? (
              <div className="mt-5">
                <div
                  className={`flex items-start gap-2.5 rounded-xl border px-4 py-3.5 text-sm ${
                    result.ok ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
                  }`}
                >
                  {result.ok && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
                  <p>{result.message}</p>
                </div>
                <Button type="button" variant="primary" onClick={close} className="!mt-5 !w-full">
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
                <p className="text-sm text-slate-500">
                  This session has limited seating and is open to confirmed Summit registrants. Enter the email you
                  registered with to check if you&rsquo;re on the list, or claim a spot if there&rsquo;s still room.
                </p>
                <LightField
                  label="Email"
                  type="email"
                  placeholder="The email you registered with"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" variant="primary" loading={isSubmitting} className="!w-full">
                  Check / RSVP
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
