import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Images } from 'lucide-react';
import { SEO } from '../../../components/seo/SEO';
import { trackEvent } from '../../../lib/analytics';
import { NotFound } from '../NotFound';
import { CompendiumMosaicBanner } from '../compendium/CompendiumMosaicBanner';
import {
  groupReportsBySession,
  useReportDownloadFlow,
  ReportAccessGateModal,
  ReportPartnerBadges,
  DOC_TYPE_CODE,
  VENUE_CODE,
} from '../../../features/reports';
import { ALBUM_OVERRIDES } from '../../../content/2026/album-overrides';

// Normalized-title match against the Flickr gallery's own album-overrides —
// deliberately exact (lowercased, punctuation stripped) rather than fuzzy, so
// this only ever links to a real, confirmed match and silently shows nothing
// otherwise (never a guessed/wrong album).
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const findMatchingAlbumId = (sessionTitle: string): string | null => {
  const target = normalize(sessionTitle);
  const match = Object.values(ALBUM_OVERRIDES).find((a) => normalize(a.displayTitle) === target);
  return match?.id ?? null;
};

// Session detail page — same two-tone header-strip treatment as
// CompendiumAbstract.tsx's OA/PA block, adapted to this collection's own
// vocabulary (venue code + day, instead of abstract type + number).
export const ReportSession2026 = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessions = useMemo(() => groupReportsBySession(), []);
  const session = sessions.find((s) => s.sessionId === sessionId);
  const { requestView, requestDownload, gateOpen, closeGate, handleVerified, gate, busyId } = useReportDownloadFlow();

  // Distinct from the per-document 'report_view' event useReportDownloadFlow
  // fires when a visitor actually opens one of this session's PDFs — this one
  // just means the session page itself was visited.
  useEffect(() => {
    if (session) void trackEvent('report_session_view', { sessionId: session.sessionId, sessionTitle: session.sessionTitle });
  }, [session]);

  if (!session) return <NotFound />;

  const albumId = findMatchingAlbumId(session.sessionTitle);

  return (
    <>
      <SEO
        title={session.sessionTitle}
        description={`Reports from "${session.sessionTitle}" — AI in Health Summit 2026.`}
        path={`/2026/reports/${session.sessionId}`}
      />

      <div className="bg-white pt-10 sm:pt-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <button
            onClick={() => navigate('/2026/reports')}
            className="text-xs font-bold uppercase tracking-[0.2em] text-compendium-ink/40 hover:text-orange"
          >
            ← Reports Library
          </button>
          <div className="mt-4 h-[90px] w-full overflow-hidden sm:h-[110px]">
            <CompendiumMosaicBanner seed={session.sessionId} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="flex flex-col border border-compendium-ink/10 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-center bg-orange px-6 py-6 text-white sm:w-[120px]">
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{VENUE_CODE[session.venue] ?? session.venue}</span>
            <span className="font-compendium-serif text-4xl font-bold leading-none">{session.day ? `D${session.day}` : '—'}</span>
          </div>
          <div className="flex-1 bg-compendium-ink px-6 py-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
              {session.venue}
              {session.dayInferred && ' · day inferred from the schedule'}
            </p>
            <h1 className="mt-2 font-compendium-serif text-xl font-bold leading-tight sm:text-2xl">{session.sessionTitle}</h1>
          </div>
        </div>
      </div>

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {session.partners.length > 0 && <ReportPartnerBadges partners={session.partners} />}
            {albumId && (
              <button
                onClick={() => navigate(`/2026/gallery/${albumId}`)}
                className="inline-flex items-center gap-1.5 border border-compendium-ink/15 px-3.5 py-1.5 text-xs font-semibold text-compendium-ink/70 hover:border-orange hover:text-orange"
              >
                <Images size={13} /> View session photos
              </button>
            )}
          </div>

          <div className="mt-6 border border-compendium-ink/10">
            {session.docs.map((doc, i) => (
              <div
                key={doc.id}
                className={`flex flex-wrap items-center justify-between gap-3 p-5 ${i > 0 ? 'border-t border-compendium-ink/10' : ''}`}
              >
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 inline-flex h-9 w-11 shrink-0 items-center justify-center bg-compendium-cream text-xs font-bold text-compendium-ink/70">
                    {DOC_TYPE_CODE[doc.docType] ?? doc.docType.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-compendium-serif text-base font-bold text-compendium-ink">{doc.docTypeLabel}</p>
                    {doc.pdfTitle && <p className="mt-0.5 text-sm text-compendium-ink/60">{doc.pdfTitle}</p>}
                    <p className="mt-1 text-xs text-compendium-ink/45">
                      {doc.pages} page{doc.pages === 1 ? '' : 's'} · {doc.sizeMB} MB
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => requestView(doc)}
                    disabled={busyId === doc.id}
                    className="border border-compendium-ink/15 px-4 py-2 text-xs font-semibold text-compendium-ink hover:border-orange hover:text-orange disabled:opacity-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => requestDownload(doc)}
                    disabled={busyId === doc.id}
                    className="bg-compendium-ink px-4 py-2 text-xs font-semibold text-white hover:bg-orange disabled:opacity-50"
                  >
                    {busyId === doc.id ? 'Preparing…' : 'Download'}
                  </button>
                </div>
              </div>
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
