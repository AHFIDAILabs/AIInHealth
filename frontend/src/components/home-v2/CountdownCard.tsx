import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '../../hooks/useCountdown';
import { Reveal } from '../ui/Reveal';
import { VENUE_SHORT } from '../../lib/siteInfo';

// Same summit date as HeroCountdown (kept in sync manually — both read the
// single source of truth in that file's constant if you'd rather import it
// from there instead of duplicating it here).
const SUMMIT_DATE = new Date('2026-10-19T09:00:00+01:00');

const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const;
type Unit = (typeof UNITS)[number];
const UNIT_LABEL: Record<Unit, string> = {
  days: 'Days',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
};

// Standalone dark "glass" countdown card — distinct from HeroCountdown, which
// stays as the borderless on-photo clock inside the hero itself. This is the
// mockup's separate, more elaborate countdown section: glow blobs, faint grid
// texture, a staggered "breathing" glow per box, and an opt-in tick sound.
//
// Browsers block autoplaying audio until a user gesture, so the beep never
// fires until the visitor clicks "Enable tick sound" — at that point we lazily
// create the AudioContext (which itself requires a gesture) and start ticking
// off the *same* countdown.seconds value useCountdown already recomputes each
// render, rather than running a second independent setInterval that could
// drift out of sync with the displayed numbers.
export const CountdownCard = () => {
  const countdown = useCountdown(SUMMIT_DATE);
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSecondRef = useRef<number>(-1);

  const beep = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  };

  if (soundOn && countdown.seconds !== lastSecondRef.current) {
    lastSecondRef.current = countdown.seconds;
    beep();
  }

  const toggleSound = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    setSoundOn((v) => !v);
  };

  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#081b2e] to-[#04101c] p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-orange/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-navy-secondary/60 blur-[100px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 75%)',
          }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange/30 bg-orange/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-orange">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange" />
            </span>
            Live &mdash; Summit starts in
          </span>

          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold transition-colors ${
              soundOn
                ? 'border-orange/50 bg-orange/15 text-orange'
                : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {soundOn ? '🔔 Tick sound on' : '🔕 Enable tick sound'}
          </button>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {UNITS.map((unit, i) => (
            <motion.div
              key={unit}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center backdrop-blur-sm"
              animate={{
                boxShadow: [
                  '0 0 0px rgba(232,121,44,0)',
                  '0 0 26px rgba(232,121,44,.3)',
                  '0 0 0px rgba(232,121,44,0)',
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
            >
              <p
                className="font-display text-4xl font-black tabular-nums text-white sm:text-5xl"
                style={{ textShadow: '0 0 18px rgba(232,121,44,.6)' }}
              >
                {String(countdown[unit]).padStart(2, '0')}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {UNIT_LABEL[unit]}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="relative mt-6 text-xs text-slate-500">
          {VENUE_SHORT} &middot; 19&ndash;20 October 2026
        </p>
      </div>
    </Reveal>
  );
};