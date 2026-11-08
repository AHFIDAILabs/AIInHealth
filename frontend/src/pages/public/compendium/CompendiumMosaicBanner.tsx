import type { ReactNode } from 'react';

// A code-generated stand-in for the Afrocentric geometric mosaic banner used
// throughout the reference compendium PDF (quarter-circles, semicircles,
// dot-grids, stripes, rings, rainbow arcs — each tile a flat block of colour
// from the same earth-tone palette). Deterministic per `seed` so the same
// section always renders the same arrangement (no layout shift between
// renders, no flicker during prerendering) without needing a shipped image
// asset.

const PALETTE = [
  '#1D1B17', // ink
  '#F0EDE9', // cream
  '#E8792C', // orange
  '#A8432B', // rust
  '#C9922E', // mustard
  '#6E7E3C', // olive
  '#2F4A5F', // steel
] as const;

const TILE = 100;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, deterministic PRNG; good enough for decorative
// layout, not cryptographic use.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Motif = 'corner' | 'circle' | 'ring' | 'semicircle' | 'dots' | 'stripes' | 'triangle' | 'rainbow';
const MOTIFS: Motif[] = ['corner', 'circle', 'ring', 'semicircle', 'dots', 'stripes', 'triangle', 'rainbow'];
const ROTATIONS = [0, 90, 180, 270];

const Tile = ({ x, bg, fg, motif, rotation }: { x: number; bg: string; fg: string; motif: Motif; rotation: number }) => {
  const s = TILE;
  const cx = s / 2;
  const cy = s / 2;

  let shape: ReactNode;
  switch (motif) {
    case 'corner':
      // Quarter-disk filling the top-left corner, bulging toward bottom-right.
      shape = <path d={`M0,0 H${s} A${s},${s} 0 0 1 0,${s} Z`} fill={fg} />;
      break;
    case 'circle':
      shape = <circle cx={cx} cy={cy} r={s * 0.32} fill={fg} />;
      break;
    case 'ring':
      shape = <circle cx={cx} cy={cy} r={s * 0.26} fill="none" stroke={fg} strokeWidth={s * 0.12} />;
      break;
    case 'semicircle':
      // Flat edge along the bottom, arching up — rotated for other facings.
      shape = <path d={`M0,${s} A${s / 2},${s / 2} 0 0 1 ${s},${s} Z`} fill={fg} />;
      break;
    case 'dots': {
      const n = 4;
      const pad = s * 0.18;
      const step = (s - pad * 2) / (n - 1);
      const dots: ReactNode[] = [];
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          dots.push(<circle key={`${row}-${col}`} cx={pad + col * step} cy={pad + row * step} r={s * 0.045} fill={fg} />);
        }
      }
      shape = <>{dots}</>;
      break;
    }
    case 'stripes': {
      const bars = 4;
      const gap = s * 0.06;
      const barH = (s - gap * (bars + 1)) / bars;
      const stripes: ReactNode[] = [];
      for (let i = 0; i < bars; i++) {
        stripes.push(<rect key={i} x={0} y={gap + i * (barH + gap)} width={s} height={barH} fill={fg} />);
      }
      shape = <>{stripes}</>;
      break;
    }
    case 'triangle':
      shape = <path d={`M0,0 L${s},0 L0,${s} Z`} fill={fg} />;
      break;
    case 'rainbow': {
      const arcs = [0.9, 0.65, 0.4];
      const colors = [fg, PALETTE[(PALETTE.indexOf(fg as (typeof PALETTE)[number]) + 2) % PALETTE.length], bg === PALETTE[0] ? PALETTE[1] : PALETTE[0]];
      shape = (
        <>
          {arcs.map((r, i) => (
            <path
              key={i}
              d={`M${cx - s * r * 0.5},${s} A${s * r * 0.5},${s * r * 0.5} 0 0 1 ${cx + s * r * 0.5},${s}`}
              fill="none"
              stroke={colors[i]}
              strokeWidth={s * 0.08}
            />
          ))}
        </>
      );
      break;
    }
  }

  return (
    <g transform={`translate(${x}, 0)`}>
      <rect width={s} height={s} fill={bg} />
      <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>{shape}</g>
    </g>
  );
};

export const CompendiumMosaicBanner = ({ seed, tiles = 11, className = '' }: { seed: string; tiles?: number; className?: string }) => {
  const rand = mulberry32(hashSeed(seed));
  const used: { bg: string; motif: Motif }[] = [];

  const tileNodes = Array.from({ length: tiles }, (_, i) => {
    const bg = PALETTE[Math.floor(rand() * PALETTE.length)];
    let fg = PALETTE[Math.floor(rand() * PALETTE.length)];
    // Keep the motif visible against its own tile's background.
    let guard = 0;
    while (fg === bg && guard < 5) {
      fg = PALETTE[Math.floor(rand() * PALETTE.length)];
      guard++;
    }
    const motif = MOTIFS[Math.floor(rand() * MOTIFS.length)];
    const rotation = ROTATIONS[Math.floor(rand() * ROTATIONS.length)];
    used.push({ bg, motif });
    return <Tile key={i} x={i * TILE} bg={bg} fg={fg} motif={motif} rotation={rotation} />;
  });

  return (
    <svg
      viewBox={`0 0 ${tiles * TILE} ${TILE}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    >
      {tileNodes}
    </svg>
  );
};
