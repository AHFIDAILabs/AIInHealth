import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { SEO } from '../../components/seo/SEO';
import { claimPromoCode } from '../../services/promo.service';
import { getApiErrorMessage } from '../../services/api';

// Reached only via the landing page's PromoBanner QR (its data URL encodes
// this exact path + a fresh ?token=). No token in the URL is treated as
// "didn't come from a real scan" — same reasoning as PaymentCallback.tsx's
// no-reference state — rather than showing a form that's certain to fail.
export const PromoClaim = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const submit = async () => {
    if (!token || !email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await claimPromoCode(token, email.trim());
      setCode(result.code);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Claim Your Free Spot"
        description="Claim your free AI in Health Summit 2026 registration code."
        path="/promo/claim"
        noindex
      />
      <PageHero
        eyebrow={t('promoClaim.eyebrow', 'Limited-Time Promo')}
        title={t('promoClaim.title', 'You Caught It!')}
        subtitle={t('promoClaim.subtitle', 'Enter your email to claim your free AI in Health Summit 2026 registration.')}
      />

      <section className="bg-offwhite py-20">
        <Reveal className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
            {!token ? (
              <>
                <XCircle size={40} className="mx-auto text-danger" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">
                  {t('promoClaim.noToken.heading', 'No QR scan detected')}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t(
                    'promoClaim.noToken.detail',
                    "This page is only reachable by scanning the QR banner as it drifts across our homepage. Keep an eye out — it appears at random, unpredictable moments."
                  )}
                </p>
                <ButtonLink to="/" variant="secondary" className="!mt-6 !border-slate-300 !bg-white !text-navy">
                  {t('promoClaim.noToken.backHome', 'Back to Homepage')}
                </ButtonLink>
              </>
            ) : code ? (
              <>
                <CheckCircle2 size={40} className="mx-auto text-success" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">
                  {t('promoClaim.success.heading', "You're in — 100% free!")}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t('promoClaim.success.detail', "We've also emailed this to you. Your access code is:")}
                </p>
                <p className="mt-4 rounded-xl bg-offwhite py-3 font-display text-2xl font-bold tracking-wide text-navy">{code}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {t('promoClaim.success.oneTime', "This code is single-use and tied to this email — you'll need it to register.")}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {t(
                    'promoClaim.success.vipExcluded',
                    'Works for any ticket category except VIP (e.g. Nigerian Professional, Student/Researcher, International Delegate are all fine).'
                  )}
                </p>
                <ButtonLink to="/register" variant="primary" className="!mt-6">
                  {t('promoClaim.success.register', 'Register Now')}
                </ButtonLink>
              </>
            ) : (
              <>
                <Sparkles size={40} className="mx-auto text-orange" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">
                  {t('promoClaim.form.heading', 'Claim your free spot')}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t('promoClaim.form.detail', "Enter the email you'll register with — your code will be tied to it.")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t(
                    'promoClaim.form.vipExcluded',
                    'Works for any ticket category except VIP (e.g. Nigerian Professional, Student/Researcher, International Delegate are all fine).'
                  )}
                </p>
                {error && (
                  <div className="mt-4 text-left">
                    <Banner variant="error">{error}</Banner>
                  </div>
                )}
                <div className="mt-5 text-left">
                  <LightField
                    label={t('promoClaim.form.emailLabel', 'Email address')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !email.trim()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange py-3 text-sm font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {submitting ? t('promoClaim.form.claiming', 'Claiming…') : t('promoClaim.form.submit', 'Claim My Free Spot')}
                </button>
              </>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
