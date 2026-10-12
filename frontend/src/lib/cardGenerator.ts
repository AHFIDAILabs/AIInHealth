// Shared engine behind every "I will be attending / presenting / speaking"
// DP card (Batches 1-3 of the event-extras plan) and reused as-is for each
// audience — only the EventCardData passed in differs.
//
// Everything here runs as <canvas> compositing IN THE VISITOR'S OWN BROWSER.
// That's the one architectural decision that matters for infrastructure
// safety: no image processing ever touches the backend, so this feature
// cannot slow down the rest of the site no matter how many people use it at
// once (see the infra-risk discussion this plan came out of). The backend's
// only involvement anywhere in this feature is emailing people a link.
//
// Visual design mirrors a reference card the user supplied (an Africa
// HealthTech Summit "I will be attending" graphic): dark navy/blue ground
// with diagonal accent streaks, a two-line white/orange headline, an orange
// info block, a FULL (non-circular) photo panel, a cyan name banner, and a
// white partner-logo strip at the bottom. The partner logos are this event's
// real confirmed set (event-extras plan conversation) — swap FOOTER_GROUPS
// below if that roster ever changes.
import { EVENT_DATE_RANGE, VENUE_SHORT } from './siteInfo';
import eventLogoUrl from '../assets/AI_Logo_New_white.png';

export type EventCardKind = 'attending' | 'presenting' | 'speaking';

export interface EventCardData {
  kind: EventCardKind;
  name: string;
  /** Remote URL (e.g. Cloudinary) or a local object URL from a file input. */
  photoUrl?: string | null;
  /** Abstract/session title — required for 'presenting'/'speaking', ignored for 'attending'. */
  line1?: string;
  /** Date/time/room string — required for 'presenting'/'speaking', ignored for 'attending'. */
  line2?: string;
}

const SIZE = 1080; // square — matches the reference card's own aspect ratio, and every major platform's post format
const MARGIN = 70;

const BRAND = {
  navy: '#0F172A',
  navyDeep: '#0A1120',
  navyMid: '#122036',
  orange: '#E8792C',
  cyan: '#49C5E0',
  white: '#FFFFFF',
  textOnCyan: '#0B1220',
};

const HEADLINE: Record<EventCardKind, [string, string]> = {
  attending: ['I WILL BE', 'ATTENDING'],
  presenting: ['I WILL BE', 'PRESENTING'],
  speaking: ['I AM', 'SPEAKING'],
};

// The real, confirmed partner set for this card's bottom strip (event-extras
// plan conversation) — "Convened By" mirrors the exact wording already used
// sitewide (Footer.tsx's "Convened by AHFID"), just extended to the second
// co-convener on record. Update this list, not the drawing code, if the
// roster changes.
const FOOTER_GROUPS: { label: string; logos: string[] }[] = [
  {
    label: 'Convened By',
    logos: [
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1790020932/ai-health-summit-2026/sno95g1kcwwuf8k9lt96.png', // AHFID
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1790581934/ai-health-summit-2026/rd9h1wvdhjioqzafici0.png', // AI in Health Summit
    ],
  },
  {
    label: 'Government Partners',
    logos: [
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1789837888/ai-health-summit-2026/aatouyklzjtgv6qg2znt.png', // Federal Ministry of Health & Social Welfare
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1789837696/ai-health-summit-2026/ej5mb9wul8uledkmoejo.png', // Nigeria CDC
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1790573701/ai-health-summit-2026/fyhjnt5r99gzutdbywur.png', // National Centre for AI and Robotics
    ],
  },
  {
    label: 'Title Partner',
    logos: [
      'https://res.cloudinary.com/ds0wznnj9/image/upload/v1789574145/ai-health-summit-2026/hjeqhya18ncpbygegexo.webp', // CHAI
    ],
  },
];

// Pure and unit-tested: wraps `text` into lines no wider than `maxWidth`,
// using an injected measure function so this has no dependency on a real
// canvas (jsdom's 2D context isn't available without a native addon this
// project doesn't otherwise need — see cardGenerator.test.ts).
export const wrapText = (text: string, maxWidth: number, measure: (s: string) => number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const attempt = `${current} ${word}`;
    // A single word wider than maxWidth is left to overflow rather than
    // split mid-word or silently drop content — a rare edge case (one very
    // long URL/name) and overflowing is safer than corrupting the text.
    if (measure(attempt) <= maxWidth) {
      current = attempt;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
};

// Pure: decides what the info block under the headline should say, with no
// canvas involved — the part of the layout that's actually worth
// unit-testing in isolation from real rendering.
export const buildDetailLines = (data: EventCardData): string[] => {
  if (data.kind === 'attending') {
    return [EVENT_DATE_RANGE, VENUE_SHORT];
  }
  return [data.line1, data.line2].filter((l): l is string => !!l && l.trim().length > 0);
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // Required so a cross-origin (e.g. Cloudinary) photo doesn't taint the
    // canvas — without this, canvas.toBlob() throws a SecurityError instead
    // of returning the composited image. Harmless on same-origin assets
    // (the bundled event logo) — the browser just ignores it there.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

// object-fit: cover, drawn into an arbitrary destination rect.
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) => {
  const imgRatio = img.width / img.height;
  const targetRatio = dWidth / dHeight;
  let sx: number, sy: number, sWidth: number, sHeight: number;
  if (imgRatio > targetRatio) {
    sHeight = img.height;
    sWidth = sHeight * targetRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = sWidth / targetRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
};

// Own implementation rather than the native ctx.roundRect — that landed in
// Safari later than the rest of this project's baseline, and this is a
// three-line function to not depend on it for.
const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawBackground = (ctx: CanvasRenderingContext2D) => {
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, BRAND.navyDeep);
  grad.addColorStop(1, BRAND.navyMid);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Diagonal light streaks — a subtle, abstracted nod to the reference
  // image's circuit/data-stream texture, drawn procedurally (no external
  // asset needed, and it scales to any photo without a mismatched crop).
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#7DD3FC';
  ctx.lineWidth = 2;
  for (let i = -4; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 140, 0);
    ctx.lineTo(i * 140 + SIZE, SIZE);
    ctx.stroke();
  }
  ctx.restore();

  // A soft warm glow echoing the reference's orange accent light.
  const glow = ctx.createRadialGradient(SIZE - 150, 150, 0, SIZE - 150, 150, 420);
  glow.addColorStop(0, 'rgba(232,121,44,0.16)');
  glow.addColorStop(1, 'rgba(232,121,44,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);
};

// Full rectangular photo (never circular — explicitly asked for), with the
// top edge feathered to fade into the dark background rather than sitting
// behind a hard rectangle edge, approximating the reference image's blended
// portrait treatment.
const drawPhotoPanel = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (!octx) return;
  drawImageCover(octx, img, 0, 0, w, h);

  // One single destination-in fill covering the WHOLE canvas — a second,
  // separate fillRect call under destination-in would wipe out whatever the
  // first call preserved outside its own shape (destination-in's "make
  // everything else transparent" applies per call, across the entire
  // canvas, not just that call's own rect — two sequential calls are
  // mutually destructive, not additive). The gradient's own color stops do
  // all the fade-then-stay-opaque work in one pass instead.
  const fadeFraction = 0.22;
  octx.globalCompositeOperation = 'destination-in';
  const grad = octx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(fadeFraction, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  octx.fillStyle = grad;
  octx.fillRect(0, 0, w, h);

  ctx.drawImage(off, x, y);
};

const HEADLINE_FONT = '800 66px Sora, sans-serif';
const HEADLINE_LINE_HEIGHT = 72;

const drawHeadline = (ctx: CanvasRenderingContext2D, lines: [string, string]) => {
  ctx.font = HEADLINE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = BRAND.white;
  ctx.fillText(lines[0], MARGIN, 230);
  ctx.fillStyle = BRAND.orange;
  ctx.fillText(lines[1], MARGIN, 230 + HEADLINE_LINE_HEIGHT);
};

const INFO_FONT = '800 28px Sora, sans-serif';
const INFO_LINE_HEIGHT = 36;
const INFO_MAX_WIDTH = 384;
const INFO_BOTTOM_Y = 640;

// Bottom-anchored (grows upward) for the same reason the old text blocks
// were — a wrapped title must never push into the headline above it,
// regardless of how many lines it takes.
const drawInfoBlock = (ctx: CanvasRenderingContext2D, rawLines: string[]) => {
  ctx.font = INFO_FONT;
  const lines = rawLines.flatMap((line) => wrapText(line, INFO_MAX_WIDTH, (s) => ctx.measureText(s).width));
  if (lines.length === 0) return;

  const paddingX = 28;
  const paddingY = 20;
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const blockWidth = Math.min(textWidth + paddingX * 2, INFO_MAX_WIDTH + paddingX * 2);
  const blockHeight = lines.length * INFO_LINE_HEIGHT + paddingY * 2 - 8;
  const blockTop = INFO_BOTTOM_Y - blockHeight;

  ctx.fillStyle = BRAND.orange;
  roundRectPath(ctx, MARGIN, blockTop, blockWidth, blockHeight, 14);
  ctx.fill();

  ctx.fillStyle = BRAND.navy;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    ctx.fillText(line, MARGIN + paddingX, blockTop + paddingY + (i + 1) * INFO_LINE_HEIGHT - 10);
  });
};

const NAME_BANNER_Y = 700;
const NAME_BANNER_HEIGHT = 84;

const drawNameBanner = (ctx: CanvasRenderingContext2D, name: string) => {
  const width = SIZE - MARGIN * 2;
  ctx.fillStyle = BRAND.cyan;
  roundRectPath(ctx, MARGIN, NAME_BANNER_Y, width, NAME_BANNER_HEIGHT, 10);
  ctx.fill();

  let fontSize = 38;
  const maxTextWidth = width - 48;
  ctx.font = `800 ${fontSize}px Sora, sans-serif`;
  while (ctx.measureText(name).width > maxTextWidth && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px Sora, sans-serif`;
  }
  ctx.fillStyle = BRAND.textOnCyan;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, MARGIN + 24, NAME_BANNER_Y + NAME_BANNER_HEIGHT / 2 + 2);
};

const FOOTER_STRIP_TOP = 860;

const drawFooterStrip = async (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = BRAND.white;
  ctx.fillRect(0, FOOTER_STRIP_TOP, SIZE, SIZE - FOOTER_STRIP_TOP);

  const colWidth = (SIZE - MARGIN * 2) / FOOTER_GROUPS.length;
  const logoH = 52;
  const gap = 14;

  for (let i = 0; i < FOOTER_GROUPS.length; i++) {
    const group = FOOTER_GROUPS[i];
    const colCenterX = MARGIN + colWidth * i + colWidth / 2;

    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(group.label.toUpperCase(), colCenterX, FOOTER_STRIP_TOP + 36);

    // Logos load independently and failures are skipped silently — one
    // broken/slow partner logo should never block the rest of the strip
    // (or the whole card) from rendering.
    const images = await Promise.all(
      group.logos.map((url) =>
        loadImage(url).catch(() => null)
      )
    );
    const validImages = images.filter((img): img is HTMLImageElement => !!img);
    if (validImages.length === 0) continue;

    const widths = validImages.map((img) => (img.width / img.height) * logoH);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (validImages.length - 1);
    let x = colCenterX - totalW / 2;
    const logoY = FOOTER_STRIP_TOP + 58;
    for (let j = 0; j < validImages.length; j++) {
      ctx.drawImage(validImages[j], x, logoY, widths[j], logoH);
      x += widths[j] + gap;
    }
  }
};

// Orchestration — not unit-tested (needs a real 2D canvas context); exercise
// this live in a browser instead. Returns a PNG Blob ready to download/share.
export async function renderEventCard(data: EventCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available in this browser.');

  drawBackground(ctx);

  // Header: the event's own logo, top-left.
  try {
    const logo = await loadImage(eventLogoUrl);
    const logoHeight = 54;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    ctx.drawImage(logo, MARGIN, 56, logoWidth, logoHeight);
  } catch {
    // Missing/failed logo shouldn't block the rest of the card.
  }

  drawHeadline(ctx, HEADLINE[data.kind]);
  drawInfoBlock(ctx, buildDetailLines(data));

  // Photo — full rectangular panel, never cropped to a circle (explicitly
  // asked for). Silently skipped if no photo was supplied or it fails to
  // load, since a missing photo shouldn't block someone from getting their
  // card at all.
  if (data.photoUrl) {
    try {
      const photo = await loadImage(data.photoUrl);
      drawPhotoPanel(ctx, photo, 560, 190, SIZE - MARGIN - 560, 470);
    } catch {
      // Photo load failed (network hiccup, CORS, broken URL) — card still
      // renders fine without it.
    }
  }

  drawNameBanner(ctx, data.name);
  await drawFooterStrip(ctx);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas failed to export an image.'))), 'image/png');
  });
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Prefers the native share sheet (so a visitor can post straight to
// Instagram/WhatsApp/etc. with the image attached) and falls back to a
// plain download wherever Web Share's file support isn't available (most
// desktop browsers today) or the visitor cancels.
export const shareOrDownloadCard = async (blob: Blob, filename: string, shareText: string): Promise<'shared' | 'downloaded'> => {
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files?: File[]; text?: string }) => Promise<void>;
  };
  const file = new File([blob], filename, { type: blob.type });
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: shareText });
      return 'shared';
    } catch {
      // Cancelled or failed — fall through to a plain download so the
      // visitor still gets their card.
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
};
