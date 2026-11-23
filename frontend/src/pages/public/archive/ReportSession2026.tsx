import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Images } from 'lucide-react';
import { PageHero } from '../../../design-system/patterns';
import { SEO } from '../../../components/seo/SEO';
import { Reveal } from '../../../components/ui/Reveal';
import { trackEvent } from '../../../lib/analytics';
import { NotFound } from '../NotFound';
import { groupReportsBySession, useReportDownloadFlow, ReportAccessGateModal, ReportPartnerBadges } from '../../../features/reports';
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

export const ReportSession2026 = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessions = useMemo(() => groupReportsBySession(), []);
  const session = sessions.find((s) => s.sessionId === sessionId);
  const { requestDownload, gateOpen, closeGate, handleVerified, gate, downloadingId } = useReportDownloadFlow();

  useEffect(() => {
    if (session) void trackEvent('report_view', { sessionId: session.sessionId, sessionTitle: session.sessionTitle });
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
      <PageHero
        eyebrow={`${session.venue}${session.day ? ` · Day ${session.day}` : ''}`}
        title={session.sessionTitle}
        subtitle={session.dayInferred ? 'Day inferred from the session schedule, not stated on the reports themselves.' : undefined}
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/2026/reports')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-orange"
          >
            <ArrowLeft size={15} /> Back to the Reports Library
          </button>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {session.partners.length > 0 && <ReportPartnerBadges partners={session.partners} />}
            {albumId && (
              <button
                onClick={() => navigate(`/2026/gallery/${albumId}`)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-orange/30 hover:text-orange"
              >
                <Images size={13} /> View session photos
              </button>
            )}
          </div>

          <Reveal>
            <ul className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {session.docs.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
                      <FileText size={16} />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-navy">{doc.docTypeLabel}</p>
                      {doc.pdfTitle && <p className="mt-0.5 text-xs text-slate-500">{doc.pdfTitle}</p>}
                      <p className="mt-1 text-xs text-slate-400">
                        {doc.pages} page{doc.pages === 1 ? '' : 's'} · {doc.sizeMB} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => requestDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy/5 px-4 py-2 text-xs font-semibold text-navy hover:bg-orange/10 hover:text-orange disabled:opacity-50"
                  >
                    <Download size={14} /> {downloadingId === doc.id ? 'Preparing…' : 'Download'}
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
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
