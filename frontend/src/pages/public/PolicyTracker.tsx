import { useEffect, useMemo, useState } from 'react';
import { Globe2, ExternalLink, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { SkeletonRows } from '../../components/ui/Skeleton';
import {
  listPublicPolicyTracker,
  type PolicyTrackerEntry,
  type PolicyFrameworkStatus,
} from '../../services/policyTracker.service';

const FRAMEWORK_COLOR: Record<PolicyFrameworkStatus, string> = {
  none_identified: 'bg-slate-100 text-slate-500',
  drafting: 'bg-warning/10 text-warning',
  adopted: 'bg-success/10 text-success',
  unclear: 'bg-chart-amber/10 text-chart-amber',
};

export const PolicyTracker = () => {
  const { t } = useTranslation();
  const FRAMEWORK_LABEL: Record<PolicyFrameworkStatus, string> = {
    none_identified: t('policyTracker.status.noneIdentified', 'None Identified'),
    drafting: t('policyTracker.status.drafting', 'Drafting'),
    adopted: t('policyTracker.status.adopted', 'Adopted'),
    unclear: t('policyTracker.status.unclear', 'Unclear'),
  };
  const [entries, setEntries] = useState<PolicyTrackerEntry[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    listPublicPolicyTracker()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const query = q.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((e) => e.country.toLowerCase().includes(query));
  }, [entries, q]);

  return (
    <div>
      <PageHero
        eyebrow={t('policyTracker.hero.eyebrow', 'Summit Objective 1')}
        title={t('policyTracker.hero.title', 'Global AI-in-Health Policy Tracker')}
        subtitle={t(
          'policyTracker.hero.subtitle',
          'Which countries have — or are drafting — a national AI-in-health framework. Reviewed by our secretariat before publishing; last checked dates are shown per entry.'
        )}
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mb-8 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('policyTracker.searchPlaceholder', 'Search by country...')}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>

        {entries === null ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <SkeletonRows rows={6} cols={2} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <Globe2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">
              {entries.length === 0
                ? t('policyTracker.empty.reviewing', 'Tracker entries are being reviewed')
                : t('policyTracker.empty.noMatch', 'No countries match your search')}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {entries.length === 0
                ? t('policyTracker.empty.reviewingBody', 'Check back soon — our secretariat reviews every entry before it publishes here.')
                : t('policyTracker.empty.noMatchBody', 'Try a different country name.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry, i) => (
              <Reveal key={entry._id} delay={i * 0.03}>
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-base font-semibold text-navy">{entry.country}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${FRAMEWORK_COLOR[entry.frameworkStatus]}`}>
                      {FRAMEWORK_LABEL[entry.frameworkStatus]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{t('policyTracker.lastChecked', 'Last checked')} {new Date(entry.lastCheckedAt).toLocaleDateString()}</span>
                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium text-orange hover:text-orange-hover"
                    >
                      {t('askWidget.source', 'Source')} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
