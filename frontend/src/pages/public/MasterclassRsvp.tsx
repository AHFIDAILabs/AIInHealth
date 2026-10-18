import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Banner } from '../../components/ui/Banner';
import { redeemMasterclassRsvp, type MasterclassRsvpStatus } from '../../services/masterclass.service';
import { getApiErrorMessage } from '../../services/api';
import { SEO } from '../../components/seo/SEO';

type ViewState = 'loading' | MasterclassRsvpStatus;

// Redeemed from the AI in Health Masterclass invite link
// (backend/src/controllers/masterclass.controller.ts's rsvp()) — one click,
// no form, since the recipient is already a confirmed Summit attendee. Mirrors
// AttendeeRsvpConfirm.tsx's shape closely (same loading -> redeem-on-mount ->
// state banner pattern).
const STATE_COPY: Record<Exclude<ViewState, 'loading' | 'invalid'>, { title: string; body: string }> = {
  confirmed: {
    title: "You're Confirmed!",
    body: "We've got you down for the AI in Health Masterclass — Day 1, 08:00–09:30, Main Hall. See you there.",
  },
  already_confirmed: {
    title: 'Already Confirmed',
    body: "You've already RSVP'd for the AI in Health Masterclass — Day 1, 08:00–09:30, Main Hall. See you there.",
  },
};

export const MasterclassRsvp = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    redeemMasterclassRsvp(token)
      .then((res) => setState(res.status))
      .catch((err) => {
        setState('invalid');
        setError(getApiErrorMessage(err));
      });
  }, [token]);

  const copy = state !== 'loading' && state !== 'invalid' ? STATE_COPY[state] : null;

  return (
    <>
      <SEO title="Masterclass RSVP" description="RSVP for the AI in Health Masterclass, Day 1 of the Summit." path="/masterclass" noindex />
      <PageHero eyebrow="AI in Health Summit 2026" title="AI in Health Masterclass" subtitle="Day 1, 08:00–09:30, Main Hall." />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {state === 'loading' && <p className="py-14 text-center text-sm text-slate-500">Confirming your RSVP…</p>}

            {state === 'invalid' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <AlertCircle size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">Invalid or Expired Link</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  We couldn&rsquo;t find a match for this RSVP link. Double-check the link from your email, or contact us directly.
                </p>
                {error && (
                  <div className="mt-4">
                    <Banner variant="error">{error}</Banner>
                  </div>
                )}
              </motion.div>
            )}

            {copy && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">{copy.title}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{copy.body}</p>
              </motion.div>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
