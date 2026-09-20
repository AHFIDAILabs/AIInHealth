import { useCallback, useRef, useState } from 'react';

// Keyed by image URL so the same photo appearing twice on a page (or a
// remount) never re-samples pixels it already has the answer for.
const cache = new Map<string, string>();

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// A raw average color from a photo is usually muddy (skin tones, neutral
// backgrounds average toward brown/gray) — pushing saturation into a modest
// band and pinning lightness into a light/pastel range (tan, sky blue, teal
// — the reference card colors) is what makes the result read as a flat
// "designed" card color rather than a smudged photo average.
const toCardColor = (r: number, g: number, b: number): string => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  s = clamp(Math.max(s, 0.3), 0.3, 0.55);
  const lAdjusted = clamp(l, 0.58, 0.72);

  const c = (1 - Math.abs(2 * lAdjusted - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lAdjusted - c / 2;
  let [r2, g2, b2] = [0, 0, 0];
  if (h < 60) [r2, g2, b2] = [c, x, 0];
  else if (h < 120) [r2, g2, b2] = [x, c, 0];
  else if (h < 180) [r2, g2, b2] = [0, c, x];
  else if (h < 240) [r2, g2, b2] = [0, x, c];
  else if (h < 300) [r2, g2, b2] = [x, 0, c];
  else [r2, g2, b2] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
};

// Deterministic fallback for speakers with no photo — still gives each card
// a distinct color (hashed from their name) rather than one flat default.
// Same light/pastel band as toCardColor above, so a no-photo card doesn't
// stand out as visibly darker than its neighbors.
export const hashColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 65%)`;
};

// Darkens a #rrggbb color by a fraction (0-1) of its own lightness — used
// for the corner accent shape, which needs to read clearly against the
// lighter flat card color it sits on.
export const shadeColor = (hex: string, amount: number): string => {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return hex;
  const [r, g, b] = [match[1], match[2], match[3]].map((c) => parseInt(c, 16));
  const darken = (c: number) => clamp(Math.round(c * (1 - amount)), 0, 255);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`;
};

// Reads the accent color straight off an <img> this component is already
// rendering — no second network request. Earlier this used its own `new
// Image()` fetch for the sampling, which (loaded with crossOrigin, next to
// the page's own plain <img> tag for the same URL) triggered inconsistent
// cache behavior in Chromium and made some photos fail to render entirely.
// Wire it up as: `<img ref={ref} crossOrigin="anonymous" onLoad={onLoad}
// src={url} />` — crossOrigin is required for the canvas read below to not
// throw on a cross-origin image (Cloudinary sends permissive CORS headers,
// so this succeeds; a host that doesn't would just keep the fallback).
export const useDominantColor = (url: string | undefined, fallback: string) => {
  const [color, setColor] = useState(() => (url && cache.has(url) ? cache.get(url)! : fallback));
  const ref = useRef<HTMLImageElement>(null);

  const onLoad = useCallback(() => {
    const img = ref.current;
    if (!img || !url) return;
    if (cache.has(url)) {
      setColor(cache.get(url)!);
      return;
    }
    try {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) return;
      const result = toCardColor(r / count, g / count, b / count);
      cache.set(url, result);
      setColor(result);
    } catch {
      // Canvas tainted by a non-CORS-enabled host, or another read
      // failure — the fallback color already set stands.
    }
  }, [url]);

  return { color, ref, onLoad };
};
