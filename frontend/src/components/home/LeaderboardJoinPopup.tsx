import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, X, CheckCircle2, UserPlus } from 'lucide-react';
import { delegateLogin } from '../../services/delegate.service';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { getApiErrorMessage, type ApiErrorShape } from '../../services/api';
import { ButtonLink } from '../ui/Button';

// Same flag PortalLayout.tsx/App.tsx gate the Leaderboard feature behind —
// no point promoting a page that isn't live.
const LEADERBOARD_ENABLED = import.meta.env.VITE_LEADERBOARD_ENABLED === 'true';
const DISMISS_KEY = 'aihs-leaderboard-popup-dismissed';
const SHOW_DELAY_MS = 5000;

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

type Outcome = 'form' | 'success' | 'not_registered';

// Homepage-only promo for the portal-only Leaderboard, since a visitor has no
// other way to discover it before logging in. Reuses the exact email-only
// delegate login (delegate.service.ts's delegateLogin, the same call
// PortalLogin.tsx makes) rather than a new "is this email registered" lookup
// endpoint — a 200 both confirms the registration AND signs them in at once,
// a 404 (REGISTRATION_NOT_FOUND) means send them to /register instead.
export const LeaderboardJoinPopup = () => {
  const { isAuthenticated, isLoading, refresh } = useDelegateAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('form');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    // Never shown to someone already signed into the portal — they already
    // have a direct way to reach the leaderboard (the nav).
    if (!LEADERBOARD_ENABLED || isLoading || isAuthenticated) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      // localStorage can throw (private browsing, blocked storage) — falls
      // through to showing it, same as every other per-viewer preference in
      // this app.
    }
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Best-effort only — it'll just show again next visit in that case.
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await delegateLogin(values.email);
      await refresh();
      setOutcome('success');
    } catch (err) {
      const code = axios.isAxiosError(err) ? (err.response?.data as ApiErrorShape | undefined)?.error?.code : undefined;
      if (code === 'REGISTRATION_NOT_FOUND') {
        setOutcome('not_registered');
      } else {
        setServerError(getApiErrorMessage(err));
      }
    }
  };

  const goToLeaderboard = () => {
    setVisible(false);
    navigate('/portal/leaderboard');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl"
          >
            <button onClick={dismiss} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-navy">
              <X size={18} />
            </button>

            {outcome === 'form' && (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <Trophy size={22} />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold text-navy">Join the Engagement Leaderboard</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Registered for AIHS 2026? Check in, bookmark sessions, and schedule meetings to climb the board — enter
                  your registered email to get started.
                </p>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 text-left">
                  {serverError && (
                    <p className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}</p>
                  )}
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-orange/50 focus:outline-none"
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-3 w-full rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                  >
                    {isSubmitting ? 'Checking…' : 'Check My Email'}
                  </button>
                </form>
              </>
            )}

            {outcome === 'success' && (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <CheckCircle2 size={22} />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold text-navy">You&rsquo;re in!</h2>
                <p className="mt-2 text-sm text-slate-500">We found your registration — see where you rank and how to climb.</p>
                <button
                  onClick={goToLeaderboard}
                  className="mt-5 w-full rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-hover"
                >
                  View the Leaderboard
                </button>
              </>
            )}

            {outcome === 'not_registered' && (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <UserPlus size={22} />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold text-navy">No confirmed registration found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  We couldn&rsquo;t match that email to a confirmed AIHS 2026 registration. Register first to join the leaderboard.
                </p>
                <ButtonLink to="/register" variant="primary" className="mt-5 !w-full !justify-center">
                  Register Now
                </ButtonLink>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
