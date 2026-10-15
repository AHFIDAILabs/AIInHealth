import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Medal,
  CheckCircle2,
  Handshake,
  Users2,
  BookmarkCheck,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Minus,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { fetchLeaderboard, updateLeaderboardOptIn, type LeaderboardResult, type LeaderboardEntry } from '../../services/delegate.service';
import { Avatar } from '../../components/ui/Avatar';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const BADGE_META: Record<string, { label: string; icon: LucideIcon; hint: string }> = {
  checked_in: { label: 'Checked In', icon: CheckCircle2, hint: 'Checked in at the registration desk' },
  networker: { label: 'Networker', icon: Handshake, hint: 'Had at least 1 accepted meeting' },
  super_networker: { label: 'Super Networker', icon: Users2, hint: 'Had 5+ accepted meetings' },
  session_explorer: { label: 'Session Explorer', icon: BookmarkCheck, hint: 'Bookmarked 5+ sessions' },
  profile_pro: { label: 'Profile Pro', icon: UserCheck, hint: 'Added a profile photo' },
  top_10: { label: 'Top 10', icon: Medal, hint: 'Ranked in the top 10' },
  top_3: { label: 'Top 3', icon: Crown, hint: 'Ranked in the top 3' },
};
const ALL_BADGE_KEYS = Object.keys(BADGE_META);

const MAX_SCORE = 100;

// Dependency-free count-up — a tiny requestAnimationFrame loop rather than
// pulling in a library for one number animation per card.
const useCountUp = (target: number, durationMs = 700): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
};

const computedAgo = (iso: string | null): string => {
  if (!iso) return 'not yet computed';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
};

const PODIUM_ORDER: Array<{ rankIndex: number; height: number }> = [
  { rankIndex: 1, height: 120 }, // #2, shorter, left
  { rankIndex: 0, height: 164 }, // #1, tallest, center
  { rankIndex: 2, height: 100 }, // #3, shortest, right
];

const PodiumCard = ({ entry, rankIndex }: { entry: LeaderboardEntry; rankIndex: number }) => {
  const score = useCountUp(entry.score);
  const isFirst = rankIndex === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: rankIndex === 0 ? 0.3 : rankIndex * 0.12, type: 'spring', stiffness: 160, damping: 16 }}
      className="relative flex flex-col items-center"
    >
      {isFirst && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 rounded-full bg-orange/25 blur-xl"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {isFirst && (
        <motion.div
          initial={{ y: -8, rotate: -8 }}
          animate={{ y: [-8, -2, -8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 mb-1 text-orange"
        >
          <Crown size={26} fill="currentColor" />
        </motion.div>
      )}
      <div className="relative z-10">
        <Avatar name={entry.name} avatarUrl={entry.avatarUrl ?? undefined} size={isFirst ? 64 : 52} className="ring-4 ring-white shadow-md" />
        <span
          className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow ${
            isFirst ? 'bg-orange' : rankIndex === 1 ? 'bg-slate-400' : 'bg-amber-700'
          }`}
        >
          {entry.rank}
        </span>
      </div>
      <p className="relative z-10 mt-2.5 max-w-[110px] truncate text-center text-[13px] font-semibold text-navy">{entry.name}</p>
      {entry.organization && (
        <p className="relative z-10 max-w-[110px] truncate text-center text-[11px] text-slate-400">{entry.organization}</p>
      )}
      <p className="relative z-10 mt-1 font-display text-lg font-bold text-orange">{score}</p>
    </motion.div>
  );
};

const RankRow = ({ entry, highlight, rowRef }: { entry: LeaderboardEntry; highlight: boolean; rowRef?: React.Ref<HTMLDivElement> }) => (
  <motion.div
    ref={rowRef}
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
      highlight ? 'border-orange/40 bg-orange/5' : 'border-slate-200 bg-white'
    }`}
  >
    <span className="w-6 shrink-0 text-center text-[13px] font-bold text-slate-400">{entry.rank}</span>
    <Avatar name={entry.name} avatarUrl={entry.avatarUrl ?? undefined} size={32} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold text-navy">
        {entry.name}
        {highlight && <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold text-white">YOU</span>}
      </p>
      {entry.organization && <p className="truncate text-[11px] text-slate-400">{entry.organization}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {entry.badges.slice(0, 3).map((badge) => {
        const meta = BADGE_META[badge];
        if (!meta) return null;
        return <meta.icon key={badge} size={13} className="text-orange" />;
      })}
    </div>
    <span className="w-10 shrink-0 text-right font-display text-sm font-bold text-navy">{entry.score}</span>
  </motion.div>
);

const BreakdownBar = ({
  label,
  value,
  max,
  tip,
}: {
  label: string;
  value: number;
  max: number;
  tip?: { text: string; to?: string };
}) => (
  <div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-semibold text-navy">{label}</span>
      <span className="text-slate-400">
        {value}/{max}
      </span>
    </div>
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        className="h-full rounded-full bg-orange"
        initial={{ width: 0 }}
        animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
    {value < max && tip && (
      <p className="mt-1 text-[11px] text-slate-500">
        {tip.to ? (
          <Link to={tip.to} className="font-semibold text-orange hover:text-orange-hover">
            {tip.text}
          </Link>
        ) : (
          tip.text
        )}
      </p>
    )}
  </div>
);

// Mirrors backend/src/utils/engagementScoring.ts's SENSITIVE_LEADERBOARD_CATEGORIES
// — copy-only here, the actual visibility decision is fully server-computed.
const SENSITIVE_CATEGORIES = ['vip', 'government_official', 'speaker'];

export const PortalLeaderboard = () => {
  const { delegate } = useDelegateAuth();
  const toast = useToast();
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [error, setError] = useState('');
  const [optInBusy, setOptInBusy] = useState(false);
  const yourRowRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const load = () => fetchLeaderboard().then(setData).catch((err) => setError(getApiErrorMessage(err, 'Could not load the leaderboard right now.')));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data && yourRowRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      requestAnimationFrame(() => yourRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  }, [data]);

  const optIn = async () => {
    setOptInBusy(true);
    try {
      await updateLeaderboardOptIn(true);
      toast('success', "You'll appear on the leaderboard within a few minutes");
      await load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setOptInBusy(false);
    }
  };

  if (error) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading leaderboard…</p>;
  }

  const { top, you, computedAt } = data;
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const yourId = delegate?.id;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Trophy size={13} className="text-orange" /> Engagement Leaderboard
        </p>
        <h1 className="font-display text-2xl font-semibold text-navy">Who&rsquo;s Leading AIHS 2026</h1>
        <p className="text-sm text-slate-500">Check in, schedule meetings, bookmark sessions — updated {computedAgo(computedAt)}.</p>
      </div>

      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-offwhite to-white px-6 pb-8 pt-10 sm:gap-10">
          {PODIUM_ORDER.filter(({ rankIndex }) => podium[rankIndex]).map(({ rankIndex, height }) => (
            <div key={rankIndex} className="flex flex-col items-center">
              <PodiumCard entry={podium[rankIndex]} rankIndex={rankIndex} />
              <div className="mt-3 w-16 rounded-t-lg bg-navy/5 sm:w-20" style={{ height }} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rest.map((entry) => (
              <RankRow key={entry.id} entry={entry} highlight={entry.id === yourId} rowRef={entry.id === yourId ? yourRowRef : undefined} />
            ))}
          </AnimatePresence>
          {top.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Nobody&rsquo;s on the board yet — be the first to check in, bookmark a session, or schedule a meeting.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your Score</p>
          <YourScoreHeader you={you} />

          {you.visible ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <BreakdownBar label="Check-in" value={you.breakdown.checkIn} max={20} tip={{ text: 'Check in at the registration desk' }} />
              <BreakdownBar
                label="Meetings"
                value={you.breakdown.meetings}
                max={50}
                tip={{ text: 'Schedule 1:1 meetings', to: '/portal/meetings' }}
              />
              <BreakdownBar
                label="Bookmarks"
                value={you.breakdown.bookmarks}
                max={20}
                tip={{ text: 'Bookmark more sessions', to: '/portal/my-agenda' }}
              />
              <BreakdownBar label="Profile photo" value={you.breakdown.profile} max={10} tip={{ text: 'Add a profile photo', to: '/portal' }} />
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-[13px] text-slate-500">
                {you.type === 'team'
                  ? "Event staff accounts aren't part of the public leaderboard."
                  : SENSITIVE_CATEGORIES.includes(you.ticketCategory ?? '') && you.leaderboardOptIn !== false
                    ? 'Your category is private by default on the public board.'
                    : "You've opted out of the public leaderboard."}
              </p>
              {you.type !== 'team' && (
                <button
                  onClick={optIn}
                  disabled={optInBusy}
                  className="rounded-full bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  Join the leaderboard
                </button>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Badges</p>
            <div className="flex flex-wrap gap-2">
              {ALL_BADGE_KEYS.map((key) => {
                const meta = BADGE_META[key];
                const earned = you.badges.includes(key);
                return (
                  <span
                    key={key}
                    title={meta.hint}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      earned ? 'bg-orange/10 text-orange' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    <meta.icon size={12} /> {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const YourScoreHeader = ({ you }: { you: LeaderboardResult['you'] }) => {
  const score = useCountUp(you.score);
  const delta = you.visible && you.previousRank !== null && you.rank !== null ? you.previousRank - you.rank : null;

  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-display text-3xl font-bold text-navy">
          {score}
          <span className="ml-1 text-sm font-medium text-slate-400">/ {MAX_SCORE}</span>
        </p>
        <p className="text-[13px] font-semibold text-slate-500">{you.visible && you.rank ? `Rank #${you.rank}` : 'Not ranked'}</p>
      </div>
      {delta !== null && delta !== 0 && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold ${
            delta > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {delta > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {Math.abs(delta)}
        </motion.span>
      )}
      {delta === 0 && (
        <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400">
          <Minus size={12} /> steady
        </span>
      )}
    </div>
  );
};
