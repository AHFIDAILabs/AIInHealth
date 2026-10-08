import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, AlertCircle } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Banner } from '../../components/ui/Banner';
import { redeemRsvp, type RsvpRedeemStatus } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';
import { SEO } from '../../components/seo/SEO';

type ViewState = 'loading' | RsvpRedeemStatus;

// Redeemed from the pending-attendee RSVP reconfirmation link
// (backend/src/controllers/registrationRsvp.controller.ts's redeem()) — this
// only records interest, it does NOT confirm the registration. An admin still
// confirms afterward (singly or in bulk) from the admin RSVP Confirmations
// list, which is what keeps the ID-verification review step intact.
const STATE_COPY: Record<Exclude<ViewState, 'loading' | 'invalid'>, { icon: typeof CheckCircle2; iconClass: string; title: string; body: string }> = {
  responded: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    title: "Thanks — You're on the List",
    body: "We've recorded that you're still planning to attend. Our team will follow up by email shortly to finalize your registration.",
  },
  already_responded: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    title: 'Already Confirmed Your Interest',
    body: "You've already let us know you're still coming — our team will follow up by email to finalize your registration.",
  },
  already_handled: {
    icon: Clock3,
    iconClass: 'bg-info/10 text-info',
    title: 'Your Registration Has Already Been Handled',
    body: 'This registration is no longer pending — check your email for your confirmation, or contact us if you believe this is a mistake.',
  },
};

export const AttendeeRsvpConfirm = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    redeemRsvp(token)
      .then((res) => setState(res.status))
      .catch((err) => {
        setState('invalid');
        setError(getApiErrorMessage(err));
      });
  }, [token]);

  const copy = state !== 'loading' && state !== 'invalid' ? STATE_COPY[state] : null;

  return (
    <>
      <SEO title="Confirm Your Interest" description="Confirm you're still planning to attend the AI in Health Summit 2026." path="/rsvp" />
      <PageHero eyebrow="AI in Health Summit 2026" title="Still Joining Us?" subtitle="Confirm you're still planning to attend." />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {state === 'loading' && <p className="py-14 text-center text-sm text-slate-500">Confirming your interest…</p>}

            {state === 'invalid' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <AlertCircle size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">Invalid or Expired Link</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  We couldn&rsquo;t find a registration for this RSVP link. Double-check the link from your email, or contact us directly.
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
                <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${copy.iconClass}`}>
                  <copy.icon size={32} />
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
