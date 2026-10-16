import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Banner } from '../../components/ui/Banner';
import { confirmScholarshipRsvp, type ScholarshipRsvpStatus } from '../../services/scholarshipApplication.service';
import { getApiErrorMessage } from '../../services/api';
import { SEO } from '../../components/seo/SEO';

type ViewState = 'loading' | ScholarshipRsvpStatus | 'invalid';

// Redeemed from the RSVP link in the seat-absorption reminder email (see
// backend/src/controllers/scholarshipApplication.controller.ts's rsvp()).
// Clicking through here is the actual decision — unlike the Registration-side
// pending-attendee RSVP, this immediately approves the application and
// issues a real scholarship AccessCode (emailed separately), with no further
// admin review step.
export const ScholarshipRsvp = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    confirmScholarshipRsvp(token)
      .then((res) => setState(res.status))
      .catch((err) => {
        setState('invalid');
        setError(getApiErrorMessage(err));
      });
  }, [token]);

  return (
    <>
      <SEO
        title="Confirm Your Seat"
        description="Confirm your seat for the AI in Health Summit 2026 Sponsored Delegate Pass."
        path="/sponsored-delegates/rsvp"
      />
      <PageHero eyebrow="Sponsored Delegate Pass" title="Confirm Your Seat" subtitle="AI in Health Summit 2026 — 19–20 October 2026" />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {state === 'loading' && <p className="py-14 text-center text-sm text-slate-500">Confirming your seat…</p>}

            {state === 'invalid' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <AlertCircle size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">Invalid or Expired Link</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  We couldn't find an application for this RSVP link. Double-check the link from your email, or contact the AHFID team directly.
                </p>
                {error && (
                  <div className="mt-4">
                    <Banner variant="error">{error}</Banner>
                  </div>
                )}
              </motion.div>
            )}

            {state === 'confirmed' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">You're Confirmed</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  Your seat for the AI in Health Summit 2026 is reserved. Check your email for your registration access code and next steps.
                </p>
              </motion.div>
            )}

            {state === 'already_decided' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">Already Handled</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  This application has already been decided. Check your email for details, or contact the AHFID team directly if you have questions.
                </p>
              </motion.div>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
