import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchPromoStatus, fetchPromoToken, type PromoStatus } from '../../services/promo.service';

// How long a visitor waits, on average, between one banner "pass" ending and
// the next one starting — randomized within this range so the timing can't
// be anticipated (per the original pitch's "movement can't be predicted by
// any easy calculation"). Kept fairly long (45s-100s) and the widget itself
// small (see the card below) so this stays a once-in-a-while surprise
// rather than a recurring distraction on the landing page.
const MIN_GAP_MS = 45_000;
const MAX_GAP_MS = 100_000;
const ENTER_SECONDS = 2;
const EXIT_SECONDS = 2;
const MIN_HOLD_SECONDS = 5;
const MAX_HOLD_SECONDS = 9;

// How often to re-check /promo/status while nothing is currently scheduled
// (before launch, or after the 10-day window has closed) — cheap enough to
// poll slowly forever without ever needing the visitor to refresh the page.
const IDLE_RECHECK_MS = 3 * 60 * 1000;

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

interface Pass {
  id: number;
  qrDataUrl: string;
  fromLeft: boolean;
  restLeftPercent: number;
  topPercent: number;
  totalSeconds: number;
  enterFraction: number;
  exitStartFraction: number;
}

// A small, transient QR-code widget that drifts across the landing page at
// unpredictable intervals — see the "QR banner promo" pitch this was built
// from. Deliberately NOT a persistent fixed bar (that's exactly the
// "clutters the landing page" outcome it was asked to avoid): it only exists
// on screen for a few seconds per pass, then is gone until its next
// randomly-timed appearance.
export const PromoBanner = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PromoStatus | null>(null);
  const [pass, setPass] = useState<Pass | null>(null);
  const passIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const scheduleNext = (delayMs: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(runCycle, delayMs);
    };

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    async function runCycle() {
      if (!mountedRef.current) return;
      try {
        const s = await fetchPromoStatus();
        if (!mountedRef.current) return;
        setStatus(s);
        if (!s.active) {
          scheduleNext(IDLE_RECHECK_MS);
          return;
        }

        const { qrDataUrl } = await fetchPromoToken();
        if (!mountedRef.current) return;

        const holdSeconds = randomBetween(MIN_HOLD_SECONDS, MAX_HOLD_SECONDS);
        const totalSeconds = ENTER_SECONDS + holdSeconds + EXIT_SECONDS;
        passIdRef.current += 1;
        setPass({
          id: passIdRef.current,
          qrDataUrl,
          fromLeft: Math.random() < 0.5,
          restLeftPercent: randomBetween(18, 55),
          topPercent: randomBetween(20, 58),
          totalSeconds,
          enterFraction: ENTER_SECONDS / totalSeconds,
          exitStartFraction: (ENTER_SECONDS + holdSeconds) / totalSeconds,
        });

        // Belt-and-braces: onAnimationComplete (below) normally clears the
        // pass and schedules the next one itself; this is just a fallback in
        // case that handler is ever missed (e.g. the tab was backgrounded
        // mid-animation, which can suppress rAF-driven completion events).
        scheduleNext(totalSeconds * 1000 + randomBetween(MIN_GAP_MS, MAX_GAP_MS));
      } catch {
        // Network hiccup, or the campaign ended mid-check — quietly retry
        // later rather than surfacing an error on the landing page.
        scheduleNext(IDLE_RECHECK_MS);
      }
    }

    // Don't ambush the very first page load — a short, still-randomized
    // initial delay before the first possible pass.
    scheduleNext(randomBetween(6_000, 15_000));

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!status?.active || !pass) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={pass.id}
        initial={{ left: pass.fromLeft ? '-30%' : '115%', opacity: 0 }}
        animate={{
          left: [pass.fromLeft ? '-30%' : '115%', `${pass.restLeftPercent}%`, `${pass.restLeftPercent}%`, pass.fromLeft ? '115%' : '-30%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: pass.totalSeconds,
          times: [0, pass.enterFraction, pass.exitStartFraction, 1],
          ease: 'easeInOut',
        }}
        onAnimationComplete={() => setPass(null)}
        style={{ position: 'fixed', top: `${pass.topPercent}%` }}
        className="pointer-events-auto z-50 w-[190px]"
      >
        <Link
          to="/promo/claim"
          className="block rounded-2xl bg-navy p-3 text-center shadow-2xl shadow-navy/40 ring-2 ring-orange/60"
        >
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-orange">
            <span className="flex items-center gap-1">
              <Sparkles size={10} /> {t('promo.banner.eyebrow', 'Free Spot')}
            </span>
            <span className="text-slate-400">
              {status.daysRemaining} {t('promo.banner.daysLeft', 'days left')}
            </span>
          </div>
          <div className="mx-auto mt-2 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
            <img src={pass.qrDataUrl} alt={t('promo.banner.qrAlt', 'Scan to claim a free registration')} className="h-full w-full" />
          </div>
          <p className="mt-2 text-[11px] font-bold leading-snug text-white">
            {t('promo.banner.cta', 'Scan to win a FREE spot!')}
          </p>
          <p className="mt-0.5 text-[9px] font-medium text-slate-400">
            {status.claimedCount} {t('promo.banner.claimed', 'claimed so far')}
          </p>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};
