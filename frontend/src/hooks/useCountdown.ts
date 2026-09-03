import { useEffect, useState } from 'react';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const computeCountdown = (target: Date): Countdown => {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

export const useCountdown = (target: Date): Countdown => {
  const [countdown, setCountdown] = useState(() => computeCountdown(target));

  useEffect(() => {
    const id = setInterval(() => setCountdown(computeCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return countdown;
};
