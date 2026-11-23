import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumMosaicBanner } from '../compendium/CompendiumMosaicBanner';
import {
  groupReportsBySession,
  useReportDownloadFlow,
  ReportAccessGateModal,
  ReportPartnerBadges,
  DOC_TYPE_CODE,
  VENUE_CODE,
  type ReportSession,
} from '../../../features/reports';

const ALL = '__all__';

// Reports Library — deliberately built on the Compendium's own visual system
// (compendium-serif type, mosaic banner, ink/orange two-tone blocks, square-
// cornered borders) rather than the rest of the site's rounded-card look:
// these are the same kind of printed-document artefact the Compendium
// catalogues, just a different collection (session reports/briefs/papers,
// not abstracts) — see CompendiumHome.tsx for the structure this mirrors.
export const Reports2026 = () => {
  const navigate = useNavigate();
  const sessions = useMemo(() => groupReportsBySession(), []);
  const [day, setDay] = useState<string>(ALL);
  const [venue, setVenue] = useState<string>(ALL);
  const { requestDownload, gateOpen, closeGate, handleVerified, gate, downloadingId } = useReportDownloadFlow();

  const venues = useMemo(() => Array.from(new Set(sessions.map((s) => s.venue))).sort(), [sessions]);
  const totalDocs = sessions.reduce((n, s) => n + s.docs.length, 0);

  const filtered = sessions.filter(
    (s) => (day === ALL || String(s.day) === day) && (venue === ALL || s.venue === venue)
  );

  return (
    <>
      <SEO
        title="2026 Summit — Reports Library"
        description="Every session report, policy brief, technical report and white paper published after the AI in Health Summit 2026 — free to download, email verification required."
        path="/2026/reports"
      />

      <section className="relative overflow-hidden bg-compendium-ink pb-0 pt-10 sm:pt-14">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">AI in Health Summit 2026 Archive</p>
          <h1 className="mt-3 font-compendium-serif text-4xl font-bold leading-tight text-white sm:text-5xl">Reports Library</h1>
          <p className="mt-4 max-w-xl font-compendium-serif text-lg italic text-white/65">
            Session reports, policy briefs, technical frameworks and white papers from every session of the Summit.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <StatPill label="Documents" value={totalDocs} />
            <StatPill label="Sessions" value={sessions.length} />
            <StatPill label="Venues" value={venues.length} />
          </div>
        </div>
        <div className="relative mt-10 h-[90px] w-full sm:h-[110px]">
          <CompendiumMosaicBanner seed="reports-library-cover" />
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-compendium-ink/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-compendium-ink/60">
              Every download requires a one-time email verification — see why on{' '}
              <Link to="/compendium" className="font-semibold text-orange hover:underline">
                the Open Access Compendium
              </Link>
              , the companion collection of abstracts from the Summit.
            </p>
          </div>

          <div className="mt-8 border border-compendium-ink/10 bg-compendium-cream/60 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FilterSelect
                label="Day"
                value={day}
                onChange={setDay}
                options={[
                  { value: '1', label: 'Day 1' },
                  { value: '2', label: 'Day 2' },
                ]}
              />
              <FilterSelect label="Venue" value={venue} onChange={setVenue} options={venues.map((v) => ({ value: v, label: v }))} />
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-compendium-ink/60" aria-live="polite">
            {filtered.length} session{filtered.length === 1 ? '' : 's'}, {filtered.reduce((n, s) => n + s.docs.length, 0)} document
            {filtered.reduce((n, s) => n + s.docs.length, 0) === 1 ? '' : 's'}
          </p>

          <ul className="mt-4 space-y-6">
            {filtered.map((session) => (
              <li key={session.sessionId}>
                <ReportSessionCard
                  session={session}
                  onOpen={() => navigate(`/2026/reports/${session.sessionId}`)}
                  onDownload={requestDownload}
                  downloadingId={downloadingId}
                />
              </li>
            ))}
          </ul>
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

const ReportSessionCard = ({
  session,
  onOpen,
  onDownload,
  downloadingId,
}: {
  session: ReportSession;
  onOpen: () => void;
  onDownload: (doc: ReportSession['docs'][number]) => void;
  downloadingId: string | null;
}) => (
  <div className="border border-compendium-ink/10">
    <div className="flex flex-col sm:flex-row">
      <button
        onClick={onOpen}
        className="flex shrink-0 flex-col items-center justify-center bg-orange px-6 py-5 text-white hover:bg-orange/90 sm:w-[110px]"
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em]">{VENUE_CODE[session.venue] ?? session.venue}</span>
        <span className="font-compendium-serif text-3xl font-bold leading-none">{session.day ? `D${session.day}` : '—'}</span>
      </button>
      <button onClick={onOpen} className="flex-1 bg-compendium-ink px-6 py-5 text-left text-white hover:bg-compendium-ink/90">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
          {session.venue}
          {session.dayInferred && ' · day inferred'}
        </p>
        <h2 className="mt-1.5 font-compendium-serif text-lg font-bold leading-tight sm:text-xl">{session.sessionTitle}</h2>
      </button>
    </div>

    <div className="p-5 sm:p-6">
      {session.partners.length > 0 && <ReportPartnerBadges partners={session.partners} />}

      <table className="mt-4 w-full min-w-[420px] border-collapse text-left text-sm">
        <tbody>
          {session.docs.map((doc) => (
            <tr key={doc.id} className="border-t border-compendium-ink/10 first:border-t-0">
              <td className="py-2.5 pr-3 align-top">
                <span className="inline-flex h-7 w-10 shrink-0 items-center justify-center bg-compendium-cream text-xs font-bold text-compendium-ink/70">
                  {DOC_TYPE_CODE[doc.docType] ?? doc.docType.slice(0, 2).toUpperCase()}
                </span>
              </td>
              <td className="w-full py-2.5 align-top text-compendium-ink">
                {doc.docTypeLabel}
                <span className="ml-2 text-xs text-compendium-ink/45">
                  {doc.pages}p · {doc.sizeMB}MB
                </span>
              </td>
              <td className="py-2.5 pl-3 text-right align-top">
                <button
                  onClick={() => onDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className="whitespace-nowrap bg-compendium-ink px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange disabled:opacity-50"
                >
                  {downloadingId === doc.id ? 'Preparing…' : 'Download'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StatPill = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-4 py-1.5">
    <span className="font-compendium-serif text-sm font-bold text-white">{value}</span>
    <span className="text-xs font-medium text-white/50">{label}</span>
  </div>
);

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => {
  const id = `reports-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-compendium-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-compendium-ink/15 bg-white px-4 py-2.5 text-sm text-compendium-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
      >
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};
