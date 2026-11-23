import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, ChevronRight, Library } from 'lucide-react';
import { PageHero } from '../../../design-system/patterns';
import { SEO } from '../../../components/seo/SEO';
import { Reveal } from '../../../components/ui/Reveal';
import { groupReportsBySession, useReportDownloadFlow, ReportAccessGateModal, ReportPartnerBadges } from '../../../features/reports';

const DAY_TABS: { value: 1 | 2 | 'all'; label: string }[] = [
  { value: 'all', label: 'All Days' },
  { value: 1, label: 'Day 1' },
  { value: 2, label: 'Day 2' },
];

// Section 8's Reports Library — every session's reports (session reports,
// policy/digital briefs, technical reports/frameworks, white papers, case
// studies) from the 55-document post-Summit library, grouped by session.
// Every download goes through the email gate (useReportDownloadFlow) — see
// docs/REPORTS-LIBRARY-BRIEF.md for why it's applied library-wide.
export const Reports2026 = () => {
  const navigate = useNavigate();
  const sessions = useMemo(() => groupReportsBySession(), []);
  const [dayFilter, setDayFilter] = useState<1 | 2 | 'all'>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const { requestDownload, gateOpen, closeGate, handleVerified, gate, downloadingId } = useReportDownloadFlow();

  const venues = useMemo(() => [...new Set(sessions.map((s) => s.venue))].sort(), [sessions]);
  const filtered = sessions.filter(
    (s) => (dayFilter === 'all' || s.day === dayFilter) && (venueFilter === 'all' || s.venue === venueFilter)
  );

  return (
    <>
      <SEO
        title="2026 Summit — Reports Library"
        description="Every session report, policy brief, technical report and white paper published after the AI in Health Summit 2026 — free to download, email verification required."
        path="/2026/reports"
      />
      <PageHero
        eyebrow="AI in Health Summit 2026 Archive"
        title="Reports Library"
        subtitle="Session reports, policy briefs, technical frameworks and white papers from every session — verify your email once to download any of them."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-offwhite/60 px-5 py-4">
              <p className="text-sm text-slate-500">
                Looking for the abstract compendium instead?{' '}
                <button onClick={() => navigate('/compendium')} className="font-semibold text-orange underline underline-offset-2">
                  Browse the AIHS 2026 Compendium
                </button>
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Library size={14} /> {sessions.reduce((n, s) => n + s.docs.length, 0)} documents, {sessions.length} sessions
              </span>
            </div>
          </Reveal>

          <div className="mt-8 flex flex-wrap gap-2">
            {DAY_TABS.map((tab) => (
              <button
                key={String(tab.value)}
                onClick={() => setDayFilter(tab.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  dayFilter === tab.value ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="mx-1 h-5 w-px self-center bg-slate-200" aria-hidden />
            <button
              onClick={() => setVenueFilter('all')}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                venueFilter === 'all' ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
              }`}
            >
              All Venues
            </button>
            {venues.map((v) => (
              <button
                key={v}
                onClick={() => setVenueFilter(v)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  venueFilter === v ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {filtered.map((session, i) => (
              <Reveal key={session.sessionId} delay={Math.min(i * 0.03, 0.3)}>
                <div className="rounded-2xl border border-slate-100 p-5 transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        onClick={() => navigate(`/2026/reports/${session.sessionId}`)}
                        className="text-left font-display text-base font-semibold text-navy hover:text-orange sm:text-lg"
                      >
                        {session.sessionTitle}
                      </button>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {session.venue}
                        {session.day && ` · Day ${session.day}`}
                        {session.dayInferred && ' (day inferred)'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/2026/reports/${session.sessionId}`)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-orange/30 hover:text-orange"
                    >
                      {session.docs.length} document{session.docs.length > 1 ? 's' : ''} <ChevronRight size={13} />
                    </button>
                  </div>

                  {session.partners.length > 0 && <ReportPartnerBadges partners={session.partners} className="mt-3" />}

                  <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                    {session.docs.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <FileText size={15} className="shrink-0 text-slate-300" /> {doc.docTypeLabel}
                        </span>
                        <button
                          onClick={() => requestDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-orange/10 hover:text-orange disabled:opacity-50"
                        >
                          <Download size={13} /> {downloadingId === doc.id ? 'Preparing…' : 'Download'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ReportAccessGateModal
        open={gateOpen}
        onClose={closeGate}
        onVerified={handleVerified}
        requestCode={gate.requestCode}
        verifyCode={gate.verifyCode}
      />
    </>
  );
};
