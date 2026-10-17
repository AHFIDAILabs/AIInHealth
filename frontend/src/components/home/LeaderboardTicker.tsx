import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchPublicLeaderboardTop3, type PublicLeaderboardEntry } from '../../services/leaderboard.service';

// Same kill switch as the portal leaderboard itself (App.tsx/PortalLayout.tsx's
// own copy of this flag) — if the gamification feature is off, this ticker
// has nothing real to show either.
const LEADERBOARD_ENABLED = import.meta.env.VITE_LEADERBOARD_ENABLED === 'true';

// Matches the engagement-score job's own recompute cadence
// (engagementScore.job.ts runs every 10 minutes) — polling faster than that
// would just refetch the same numbers.
const REFRESH_MS = 10 * 60 * 1000;

const MEDAL = ['🥇', '🥈', '🥉'];

// A continuously-scrolling "news flash" strip across the homepage showing the
// top 3 engagement-score leaders, refreshed every 10 minutes. Purely
// decorative/promotional — same public, already-privacy-filtered data the
// portal leaderboard itself shows (leaderboardVisible only), just the top 3
// and name/organization/score rather than the full board. Renders nothing
// (not even an empty bar) until there's real data, so a fresh event with
// nobody opted in yet never shows a visibly broken/empty ticker.
export const LeaderboardTicker = () => {
  const [entries, setEntries] = useState<PublicLeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!LEADERBOARD_ENABLED) return;
    let cancelled = false;

    const load = () => {
      fetchPublicLeaderboardTop3()
        .then((result) => {
          if (!cancelled) setEntries(result.top);
        })
        .catch(() => {
          // Quiet failure — a homepage ticker isn't worth surfacing an error
          // banner for; it just stays hidden (or keeps showing its last good
          // data) until the next refresh succeeds.
        });
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!LEADERBOARD_ENABLED || !entries || entries.length === 0) return null;

  const segment = entries.map((e, i) => (
    <span key={`${i}-${e.name}`} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
      <span className="text-base">{MEDAL[e.rank - 1] ?? '🏅'}</span>
      {e.name}
      {e.organization && <span className="font-normal text-white/60">— {e.organization}</span>}
      <span className="font-bold text-orange">{e.score} pts</span>
    </span>
  ));

  return (
    <div className="overflow-hidden bg-navy py-2 text-white" role="marquee" aria-label="Leaderboard top 3">
      <style>{`
        @keyframes leaderboard-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .leaderboard-ticker-track { animation: none !important; }
        }
      `}</style>
      <div className="flex items-center">
        <span className="z-10 ml-4 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Trophy size={12} /> Leaderboard
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div
            className="leaderboard-ticker-track flex w-max"
            style={{ animation: 'leaderboard-ticker-scroll 22s linear infinite' }}
          >
            <div className="flex shrink-0">{segment}</div>
            <div className="flex shrink-0" aria-hidden="true">
              {segment}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
