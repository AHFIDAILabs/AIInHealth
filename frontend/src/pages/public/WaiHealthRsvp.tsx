import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Ban, AlertCircle } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Banner } from '../../components/ui/Banner';
import { confirmWaiHealthRsvp, type WaiHealthRsvpStatus } from '../../services/waiHealth.service';
import { getApiErrorMessage } from '../../services/api';
import { SEO } from '../../components/seo/SEO';

type ViewState = 'loading' | WaiHealthRsvpStatus | 'invalid';

// Keyed by translation key pairs rather than literal strings, so the actual
// English fallback text lives in one place (the t() call below) instead of
// twice (here and again at the call site).
const STATE_COPY: Record<Exclude<ViewState, 'loading' | 'invalid'>, { icon: typeof CheckCircle2; iconClass: string; titleKey: string; titleFallback: string; bodyKey: string; bodyFallback: string }> = {
  confirmed: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    titleKey: 'waiHealth.rsvp.confirmedTitle',
    titleFallback: "You're Confirmed",
    bodyKey: 'waiHealth.rsvp.confirmedBody',
    bodyFallback: "Your seat for the Women in AI & Health Breakfast is reserved. We'll see you at 08:00 on Day 1 — check your email for venue details.",
  },
  already_confirmed: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    titleKey: 'waiHealth.rsvp.alreadyConfirmedTitle',
    titleFallback: 'Already Confirmed',
    bodyKey: 'waiHealth.rsvp.alreadyConfirmedBody',
    bodyFallback: "You've already confirmed your seat for the Women in AI & Health Breakfast. See you at 08:00 on Day 1!",
  },
  full: {
    icon: Clock,
    iconClass: 'bg-warning/10 text-warning',
    titleKey: 'waiHealth.rsvp.fullTitle',
    titleFallback: 'The Breakfast Is Full',
    bodyKey: 'waiHealth.rsvp.fullBody',
    bodyFallback: "All seats for the Women in AI & Health Breakfast have been claimed. Please contact AHFID directly if you'd like to be added to the waitlist.",
  },
  not_eligible: {
    icon: Ban,
    iconClass: 'bg-danger/10 text-danger',
    titleKey: 'waiHealth.rsvp.notEligibleTitle',
    titleFallback: 'Unable to Confirm This Seat',
    bodyKey: 'waiHealth.rsvp.notEligibleBody',
    bodyFallback: 'This session is reserved exclusively for women leaders across health, technology, research, and innovation. If you believe this is a mistake, please contact AHFID directly.',
  },
};

// Redeemed from the RSVP link in the signup email (see
// backend/src/controllers/waiHealth.controller.ts's rsvp()) — this is the
// page that actually reserves the seat, not the original signup form.
export const WaiHealthRsvp = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    confirmWaiHealthRsvp(token)
      .then((res) => setState(res.status))
      .catch((err) => {
        setState('invalid');
        setError(getApiErrorMessage(err));
      });
  }, [token]);

  const copy = state !== 'loading' && state !== 'invalid' ? STATE_COPY[state] : null;

  return (
    <>
      <SEO
        title="Confirm Your Seat"
        description="Confirm your seat for the Women in AI & Health Breakfast at the AI in Health Summit 2026."
        path="/wai-health-breakfast/rsvp"
      />
      <PageHero
        eyebrow={t('waiHealth.rsvp.heroEyebrow', 'Day 1 · 08:00–09:00')}
        title={t('waiHealth.rsvp.heroTitle', 'Women in AI & Health Breakfast')}
        subtitle={t('waiHealth.rsvp.heroSubtitle', "Leading the Future: Women's Voices Shaping AI and Health in Africa")}
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {state === 'loading' && (
              <p className="py-14 text-center text-sm text-slate-500">{t('waiHealth.rsvp.loading', 'Confirming your seat…')}</p>
            )}

            {state === 'invalid' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <AlertCircle size={32} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">{t('waiHealth.rsvp.invalidTitle', 'Invalid or Expired Link')}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  {t(
                    'waiHealth.rsvp.invalidBody',
                    "We couldn't find a registration for this RSVP link. Double-check the link from your email, or contact AHFID directly."
                  )}
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
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">{t(copy.titleKey, copy.titleFallback)}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{t(copy.bodyKey, copy.bodyFallback)}</p>
              </motion.div>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
