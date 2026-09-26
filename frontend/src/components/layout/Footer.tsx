import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AhfidBadge } from '../ui/AhfidBadge';
import summitMark from '../../assets/images/summit_logo_mark.png';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../lib/siteInfo';

export const Footer = () => {
  const { t } = useTranslation();
  return (
  <footer className="w-full justify-between border-t border-slate-800 bg-navy-nav">
    <div className="flex w-full flex-col gap-10 px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
      <div className="flex flex-col items-start gap-2.5">
        <img src={summitMark} alt="" aria-hidden="true" className="h-9 w-9 rounded-md" />
        <p className="font-display text-lg font-semibold text-white">AI in Health Summit 2026</p>
        <p className="max-w-sm text-sm leading-relaxed text-slate-400">
          {t('footer.tagline', 'Helping Nigeria and the region adopt AI in health responsibly, with the policy, funding, and systems to back it up.')}
        </p>
      </div>

      <div className="grid gap-10 sm:grid-cols-3">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('footer.about.heading', 'About')}</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><a href="https://ahfid.org/" target="_blank" rel="noopener noreferrer" className="hover:text-orange">{t('footer.about.aboutAhfid', 'About AHFID')}</a></li>
            <li><Link to="/contact" className="hover:text-orange">{t('footer.about.contact', 'Contact')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('footer.summit.heading', 'Summit')}</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/agenda" className="hover:text-orange">{t('nav.agenda', 'Agenda')}</Link></li>
            <li><Link to="/speakers" className="hover:text-orange">{t('nav.speakers', 'Speakers')}</Link></li>
            <li><Link to="/partners" className="hover:text-orange">{t('footer.summit.partners', 'Partners')}</Link></li>
            <li><Link to="/innovation-showcase/confirmed" className="hover:text-orange">{t('nav.innovations', 'Innovations')}</Link></li>
            <li><Link to="/gallery" className="hover:text-orange">{t('nav.gallery', 'Gallery')}</Link></li>
            <li><Link to="/abstracts/confirmed" className="hover:text-orange">{t('footer.summit.submitAbstract', 'Submit an Abstract')}</Link></li>
            <li><Link to="/policy-tracker" className="hover:text-orange">{t('footer.summit.policyTracker', 'Policy Tracker')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('footer.legal.heading', 'Legal & Support')}</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/privacy" className="hover:text-orange">{t('footer.legal.privacy', 'Privacy Policy')}</Link></li>
            <li><Link to="/terms" className="hover:text-orange">{t('footer.legal.terms', 'Terms of Service')}</Link></li>
            <li>
              <a href={SUPPORT_MAILTO} className="hover:text-orange">{SUPPORT_EMAIL}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
     <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row sm:items-center">
        <AhfidBadge />
        <p className="text-xs text-slate-500">
          {t('footer.bottomLine', 'Abuja, Nigeria · 19–20 October 2026 · © 2026 AI in Health Summit. All rights reserved.')}
        </p>
      </div>
  </footer>
  );
};
