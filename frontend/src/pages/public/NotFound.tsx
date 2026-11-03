import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AbujaSkyline } from '../../components/ui/AbujaSkyline';
import { ButtonLink } from '../../components/ui/Button';
import { SEO } from '../../components/seo/SEO';
import { trackEvent } from '../../lib/analytics';

export const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  // Section 8.1 — logs the requested path + referrer so broken links
  // (the brief cites 276 "Page Not Found" views in the 2026 analytics) can
  // actually be found and fixed, instead of just counted.
  useEffect(() => {
    trackEvent('page_not_found', { path: location.pathname, referrer: document.referrer || null });
  }, [location.pathname]);

  return (
  <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-white px-4 text-center">
    <SEO title="Page Not Found" description="The page you're looking for doesn't exist or has moved." path="/404" noindex />
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.5]"
      style={{
        backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        maskImage: 'radial-gradient(ellipse 50% 60% at 50% 40%, black, transparent 75%)',
      }}
    />
    <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/[0.06] blur-[100px]" />

    <p className="relative font-display text-7xl font-bold text-orange">404</p>
    <h1 className="relative mt-3 font-display text-2xl font-semibold text-navy">{t('notFound.heading', 'Page Not Found')}</h1>
    <p className="relative mt-2 max-w-sm text-slate-500">
      {t('notFound.body', 'The page you’re looking for doesn’t exist or has moved.')}
    </p>
    <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
      <ButtonLink to="/" variant="primary">
        {t('notFound.returnHome', 'Return Home')}
      </ButtonLink>
      <ButtonLink to="/compendium" variant="secondary">Browse the Compendium</ButtonLink>
      <ButtonLink to="/2027" variant="secondary">Join the 2027 List</ButtonLink>
    </div>

    <AbujaSkyline tone="onLight" className="pointer-events-none absolute bottom-0 left-0 h-24 w-full" opacity={0.18} />
  </div>
  );
};
