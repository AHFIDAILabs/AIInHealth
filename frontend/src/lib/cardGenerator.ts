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
// CARD_TEMPLATES ships with a programmatic navy/orange gradient background —
// a placeholder using this site's real brand tokens (see tailwind.config.js),
// not the final professionally-designed artwork. Swapping in real template
// art later is a one-line change (set `backgroundImageUrl` on the relevant
// template) with no other code to touch — `renderEventCard` already prefers
// it over the gradient whenever it's present.
import { EVENT_DATE_RANGE, VENUE_SHORT } from './siteInfo';

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

interface TextStyle {
  font: string;
  color: string;
  align: CanvasTextAlign;
  lineHeight: number;
}

interface CardTemplateConfig {
  width: number;
  height: number;
  /** Real designed artwork, once available — drawn full-bleed (cover-fit) in place of the gradient below. */
  backgroundImageUrl?: string;
  gradient: { from: string; to: string; angleDeg: number };
  heading: string;
  headingStyle: TextStyle & { x: number; y: number };
  // Name and detail are laid out bottom-up (see renderEventCard) rather than
  // from a fixed top y — a wrapped title (2+ lines, common for real abstract
  // titles) would otherwise push the block below it down into whatever sits
  // underneath, which is exactly the overlap a live render surfaced during
  // verification: a 2-line title pushed the date/room line down into the
  // footer. Anchoring to where each block ENDS keeps the footer's position
  // safe no matter how many lines a name or title wraps to.
  name: TextStyle & { x: number; maxWidth: number; gapAboveDetail: number };
  detail: TextStyle & { x: number; bottomY: number; maxWidth: number };
  photo?: { cx: number; cy: number; radius: number; ringColor: string; ringWidth: number };
  footer: TextStyle & { x: number; y: number };
}

const SIZE = 1080; // square — matches the reference card's own aspect ratio, and every major platform's post format

const BRAND = {
  navy: '#0F172A',
  navySecondary: '#14213D',
  orange: '#E8792C',
  white: '#FFFFFF',
};

const baseTemplate = (heading: string): CardTemplateConfig => ({
  width: SIZE,
  height: SIZE,
  gradient: { from: BRAND.navy, to: BRAND.navySecondary, angleDeg: 135 },
  heading,
  headingStyle: { x: 72, y: 150, font: '800 64px Sora, sans-serif', color: BRAND.orange, align: 'left', lineHeight: 70 },
  name: { x: 72, font: '700 52px Sora, sans-serif', color: BRAND.white, align: 'left', maxWidth: SIZE - 144, lineHeight: 58, gapAboveDetail: 36 },
  detail: { x: 72, bottomY: SIZE - 90, font: '500 30px "Plus Jakarta Sans", sans-serif', color: '#CBD5E1', align: 'left', maxWidth: SIZE - 144, lineHeight: 38 },
  photo: { cx: SIZE - 220, cy: 340, radius: 160, ringColor: BRAND.orange, ringWidth: 8 },
  footer: { x: SIZE / 2, y: SIZE - 36, font: '700 22px Sora, sans-serif', color: 'rgba(255,255,255,0.55)', align: 'center', lineHeight: 26 },
});

export const CARD_TEMPLATES: Record<EventCardKind, CardTemplateConfig> = {
  attending: baseTemplate('I WILL BE ATTENDING'),
  presenting: baseTemplate('I WILL BE PRESENTING'),
  speaking: baseTemplate('I AM SPEAKING AT AIHS 2026'),
};

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

// Pure: decides what the two detail lines under the name should say, with
// no canvas involved — the part of the layout that's actually worth
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
    // of returning the composited image. Needs the source to actually send
    // CORS headers (Cloudinary does by default); verify live with a real
    // photoUrl before shipping, not just with local file-upload object URLs
    // (which are same-origin and wouldn't surface this).
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

const drawTextBlock = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  style: TextStyle
) => {
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * style.lineHeight));
};

// Orchestration — not unit-tested (needs a real 2D canvas context); exercise
// this live in a browser instead. Returns a PNG Blob ready to download/share.
export async function renderEventCard(
  data: EventCardData,
  template: CardTemplateConfig = CARD_TEMPLATES[data.kind]
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available in this browser.');

  // Background: real artwork if supplied, otherwise the brand gradient.
  if (template.backgroundImageUrl) {
    const bg = await loadImage(template.backgroundImageUrl);
    drawImageCover(ctx, bg, 0, 0, template.width, template.height);
  } else {
    const angle = (template.gradient.angleDeg * Math.PI) / 180;
    const x1 = template.width / 2 - (Math.cos(angle) * template.width) / 2;
    const y1 = template.height / 2 - (Math.sin(angle) * template.height) / 2;
    const x2 = template.width / 2 + (Math.cos(angle) * template.width) / 2;
    const y2 = template.height / 2 + (Math.sin(angle) * template.height) / 2;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, template.gradient.from);
    gradient.addColorStop(1, template.gradient.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, template.width, template.height);
  }

  // Photo — circular, with a brand-colored ring. Silently skipped (not a
  // thrown error) if no photo was supplied or it fails to load, since a
  // missing photo shouldn't block someone from getting their card at all.
  if (template.photo && data.photoUrl) {
    try {
      const photo = await loadImage(data.photoUrl);
      const { cx, cy, radius, ringColor, ringWidth } = template.photo;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawImageCover(ctx, photo, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + ringWidth / 2, 0, Math.PI * 2);
      ctx.lineWidth = ringWidth;
      ctx.strokeStyle = ringColor;
      ctx.stroke();
    } catch {
      // Photo load failed (network hiccup, CORS, broken URL) — card still
      // renders fine without it.
    }
  }

  drawTextBlock(ctx, [template.heading], template.headingStyle.x, template.headingStyle.y, template.headingStyle);

  const measureName = (s: string) => {
    ctx.font = template.name.font;
    return ctx.measureText(s).width;
  };
  const measureDetail = (s: string) => {
    ctx.font = template.detail.font;
    return ctx.measureText(s).width;
  };
  const nameLines = wrapText(data.name, template.name.maxWidth, measureName);
  const detailLines = buildDetailLines(data).flatMap((line) => wrapText(line, template.detail.maxWidth, measureDetail));

  // Bottom-up: the detail block's LAST line always lands on bottomY, then
  // the name block's last line sits a fixed gap above the detail block's
  // first line — so neither block's size changes where the footer (or
  // anything else) ends up, regardless of how many lines either wrapped to.
  const detailStartY = template.detail.bottomY - (detailLines.length - 1) * template.detail.lineHeight;
  const nameBottomY = detailStartY - template.name.gapAboveDetail;
  const nameStartY = nameBottomY - (nameLines.length - 1) * template.name.lineHeight;

  drawTextBlock(ctx, nameLines, template.name.x, nameStartY, template.name);
  drawTextBlock(ctx, detailLines, template.detail.x, detailStartY, template.detail);
  drawTextBlock(ctx, ['AI in Health Summit 2026'], template.footer.x, template.footer.y, template.footer);

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
