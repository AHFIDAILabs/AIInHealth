import { motion } from 'framer-motion';
import { useCountdown } from '../../hooks/useCountdown';

const SUMMIT_DATE = new Date('2026-10-19T09:00:00+01:00');

interface HeroCountdownProps {
  className?: string;
}

// No card, no border, no fill — reads straight off the hero photo like a wall
// clock mounted flush on the wall: big glowing digits with a blinking colon
// between each group, the way an LED display ticks.
export const HeroCountdown = ({ className = '' }: HeroCountdownProps) => {
  const countdown = useCountdown(SUMMIT_DATE);
  const units = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Min', value: countdown.minutes },
    { label: 'Sec', value: countdown.seconds },
  ];

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-orange/90">Counting Down To Abuja</p>

      <div className="flex items-start">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start">
            <div className="flex flex-col items-center px-1.5 sm:px-2.5">
              <motion.p
                className="font-display text-5xl font-black tabular-nums leading-none text-white sm:text-6xl lg:text-7xl"
                style={{ textShadow: '0 0 18px rgba(232,121,44,0.9), 0 0 48px rgba(232,121,44,0.55)' }}
                animate={{ opacity: [0.88, 1, 0.88] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
              >
                {String(u.value).padStart(2, '0')}
              </motion.p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-orange sm:text-xs">
                {u.label}
              </p>
            </div>

            {i < units.length - 1 && (
              <motion.span
                aria-hidden="true"
                className="mt-1 text-4xl font-black leading-none text-orange sm:text-5xl lg:text-6xl"
                style={{ textShadow: '0 0 18px rgba(232,121,44,0.9)' }}
                animate={{ opacity: [1, 0.15, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              >
                :
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
