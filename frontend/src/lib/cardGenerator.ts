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
// Visual design is now the user's own real template artwork
// (card-attending-template.png) — a flattened, no-layers PNG, not a
// procedurally-drawn background. There's no separate "blank" version with
// the photo/name/role regions left empty, so this composites real content
// on top of the SAME flattened image for every card:
//   - photo: drawn over the placeholder silhouette (clipped to match its
//     rounded-square box); left alone entirely if no photo was supplied —
//     the baked-in placeholder IS the correct empty state.
//   - name: drawn into the blank white box (genuinely empty in the source).
//   - role label: the source says "DELEGATE" — that's blotted out (painted
//     over with a sampled patch of the real background behind it) and
//     redrawn with whatever this person's real role is.
//   - for every kind except 'attending': the headline ("I will be
//     attending", in the source's own bold rounded sans — NOT a script
//     font, despite how it reads at a glance) and the THEME block (the
//     summit theme, correct as-is for 'attending') are ALSO blotted and
//     redrawn — this card needs different words there, and there's no
//     "presenting"/"speaking"/"showcase" version of that art to draw from
//     instead. The replacement headline uses Baloo 2 (a real Google Font
//     closely matching that same chunky rounded-bold look) plus two small
//     hand-drawn-style accents the original art also has: a bent arrow after
//     line 1 and a swish-arrow underline beneath line 2 — not a pixel-exact
//     reproduction, but the same font family, color treatment, and
//     decorative accents rather than just the same two colors.
import { EVENT_DATE_RANGE, VENUE_SHORT } from './siteInfo';
import templateUrl from '../assets/images/card-attending-template.png';

export type EventCardKind = 'attending' | 'presenting' | 'speaking' | 'showcase';

export interface EventCardData {
  kind: EventCardKind;
  name: string;
  /** Remote URL (e.g. Cloudinary) or a local object URL from a file input. */
  photoUrl?: string | null;
  /** Abstract/session/project title — required for every kind except 'attending'. */
  line1?: string;
  /** Date/time/room (or category/tagline for 'showcase') — required for every kind except 'attending'. */
  line2?: string;
  /**
   * Replaces the template's baked-in "DELEGATE" label — e.g. "Delegate",
   * "Speaker", "Organizer", "Presenter". Defaults to a sensible value per
   * `kind` if omitted (see ROLE_DEFAULT below), but a caller that knows the
   * person's actual role (a team/staff registration, a confirmed speaker)
   * should always pass it explicitly — the label is about the PERSON, not
   * just which of the three card layouts they're generating.
   */
  roleLabel?: string;
}

const ROLE_DEFAULT: Record<EventCardKind, string> = {
  attending: 'Delegate',
  presenting: 'Presenter',
  speaking: 'Speaker',
  showcase: 'Innovator',
};

// The template's own native resolution — used as the canvas size directly so
// every region coordinate below maps 1:1 onto the source image with no
// scaling arithmetic to get wrong.
const W = 1800;
const H = 2250;

const BRAND = {
  navy: '#0F172A',
  orange: '#E8792C',
  white: '#FFFFFF',
};

// Pixel regions in the template's own 1800x2250 coordinate space. Measured
// off the reference image — close, but expect a pixel or two of drift; this
// is the one part of this file most likely to need a live-render-and-compare
// pass to true up, the same way the rest of this card engine's layout work
// has gone.
// Widened from the template's original (much narrower) placeholder box so a
// real photo fills more of its side of the card, but stopped short of
// NAME_BOX's left edge (984) by PHOTO_NAME_GAP — butting the two boxes
// together with no gap at all read as the photo and name card merging into
// one shape rather than two distinct cards.
const PHOTO_NAME_GAP = 36;
const PHOTO_BOX = { x: 186, y: 540, w: 984 - 186 - PHOTO_NAME_GAP, h: 765, r: 48 };
const NAME_BOX = { x: 984, y: 540, w: 630, h: 248 };
const ROLE_BLOT = { x: 186, y: 1330, w: 760, h: 110 };
const ROLE_TEXT_Y = 1410;
// Kept conservatively INSIDE the dark photo-row area — safely below the name
// box's real bottom edge (788) and safely above the role label's own blot
// (1330), rather than the first-pass bounds that overlapped both (the
// visible seams that live-rendering caught).
const HEADLINE_BLOT = { x: 940, y: 820, w: 790, h: 480 };
// Kept conservatively INSIDE the white bottom card's left (theme) half, wide
// enough to fully cover the original 4-line theme paragraph (its longest
// line runs to roughly x=888) while staying short of the vertical divider
// at x=979 — the first shrunk-too-far pass left that line's tail end
// ("...Framework") still visibly peeking out past the blot's right edge.
const THEME_BLOT = { x: 196, y: 1506, w: 740, h: 440 };

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

// Pure: decides what the info block (THEME block, for non-attending cards)
// should say, with no canvas involved — the part of the layout that's
// actually worth unit-testing in isolation from real rendering.
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
    // (the bundled template/logo) — the browser just ignores it there.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

// object-fit: cover, drawn into an arbitrary destination rect — always fills
// the box edge-to-edge. `focusY` controls where a vertical (height) crop is
// anchored: 0 keeps the top of the source image, 1 keeps the bottom, 0.5 is
// a plain center crop.
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number,
  focusY = 0.5
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
    sy = (img.height - sHeight) * focusY;
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

// Paints over a region of the ALREADY-DRAWN template image with a patch
// sampled from its own real background (not a flat guessed hex), so a
// blotted-out region blends into whatever subtle gradient/texture already
// sits there. Samples the rect's own corners rather than assuming a flat
// color, since several of these regions sit on soft gradients.
const blotRegion = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  const topLeft = ctx.getImageData(x + 2, y + 2, 1, 1).data;
  const bottomRight = ctx.getImageData(x + w - 2, y + h - 2, 1, 1).data;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `rgba(${topLeft[0]},${topLeft[1]},${topLeft[2]},${topLeft[3] / 255})`);
  grad.addColorStop(1, `rgba(${bottomRight[0]},${bottomRight[1]},${bottomRight[2]},${bottomRight[3] / 255})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
};

// Loaded on demand (only for 'presenting'/'speaking'/'showcase' cards, which
// need to draw NEW headline words the template's own baked-in art doesn't
// have) — never added to index.html's global <head>, since every other card
// kind never touches this font at all.
//
// Baloo 2, not Caveat: the template's own "I will be attending" headline is
// set in a chunky, rounded, EXTRA-bold sans — not a cursive/handwriting
// script — so a script font (the original choice here) looked thin and out
// of place next to it instead of matching. Baloo 2 is the closest free
// Google Font to that same bubbly rounded-terminal bold look.
let headlineFontPromise: Promise<void> | null = null;
const ensureHeadlineFont = (): Promise<void> => {
  if (!headlineFontPromise) {
    headlineFontPromise = (async () => {
      if (!document.querySelector('link[data-card-font="baloo2"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.dataset.cardFont = 'baloo2';
        link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap';
        document.head.appendChild(link);
        await new Promise((resolve) => {
          link.onload = resolve;
          link.onerror = resolve;
        });
      }
      try {
        await document.fonts.load('800 100px "Baloo 2"');
      } catch {
        // Font failed to load — the fallback font stack still renders something.
      }
    })();
  }
  return headlineFontPromise;
};

// The template's baked-in "I will be attending" headline pairs its text with
// two small hand-drawn accents that the old Caveat-only replacement never
// reproduced: a small bent arrow after line 1, and a loose swish-arrow
// underline beneath line 2. Redrawing both for the replacement headlines is
// what actually makes them read as the same design instead of just the same
// two-tone color choice.
const drawBentArrow = (ctx: CanvasRenderingContext2D, tipX: number, tipY: number, size: number, color: string) => {
  const dx = size * Math.cos(Math.PI / 4);
  const dy = size * Math.sin(Math.PI / 4);
  const startX = tipX + dx;
  const startY = tipY - dy;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const headLen = size * 0.42;
  const angle = Math.atan2(tipY - startY, tipX - startX);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headLen * Math.cos(angle - Math.PI / 7), tipY - headLen * Math.sin(angle - Math.PI / 7));
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headLen * Math.cos(angle + Math.PI / 7), tipY - headLen * Math.sin(angle + Math.PI / 7));
  ctx.stroke();
  ctx.restore();
};

const drawSwishArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) => {
  const endX = x + width;
  const endY = y + width * 0.08;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + width * 0.35, y + width * 0.22, x + width * 0.6, y - width * 0.14, endX, endY);
  ctx.stroke();

  const headLen = width * 0.16;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * 0.9, endY - headLen * 0.55);
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * 0.25, endY + headLen * 0.85);
  ctx.stroke();
  ctx.restore();
};

// Headshots (passport/ID-style photos especially) typically have the face
// positioned above the frame's vertical center with little headroom to
// spare — a plain 0.5 center crop trims equally from top and bottom, which
// on a portrait-oriented photo squeezed into this near-square box ends up
// cutting into the top of the head. Anchoring higher keeps the head intact
// at the cost of a bit more shoulder/chest room at the bottom instead.
const PHOTO_FOCUS_Y = 0.15;

const drawPhoto = async (ctx: CanvasRenderingContext2D, photoUrl: string) => {
  try {
    const photo = await loadImage(photoUrl);
    ctx.save();
    roundRectPath(ctx, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.w, PHOTO_BOX.h, PHOTO_BOX.r);
    ctx.clip();
    drawImageCover(ctx, photo, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.w, PHOTO_BOX.h, PHOTO_FOCUS_Y);
    ctx.restore();
  } catch {
    // Photo failed to load — the template's own placeholder silhouette
    // underneath is the correct empty state, so just leave it showing.
  }
};

// Wraps onto up to two lines at a large, fixed bold size instead of staying
// on one line and shrinking to fit — a long name used to end up tiny and
// thin; now it flows as a short column of up to two lines instead, only
// shrinking the font as a last resort if even two lines can't hold it.
const NAME_FONT_SIZE = 60;
const NAME_MIN_FONT_SIZE = 34;
const NAME_LINE_HEIGHT_RATIO = 1.12;

const drawName = (ctx: CanvasRenderingContext2D, name: string) => {
  const maxTextWidth = NAME_BOX.w - 64;
  let fontSize = NAME_FONT_SIZE;
  let lines: string[] = [name];
  while (fontSize > NAME_MIN_FONT_SIZE) {
    ctx.font = `800 ${fontSize}px Sora, sans-serif`;
    lines = wrapText(name, maxTextWidth, (s) => ctx.measureText(s).width);
    if (lines.length <= 2) break;
    fontSize -= 2;
  }
  ctx.font = `800 ${fontSize}px Sora, sans-serif`;
  ctx.fillStyle = BRAND.navy;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = fontSize * NAME_LINE_HEIGHT_RATIO;
  const blockHeight = (lines.length - 1) * lineHeight;
  const firstLineY = NAME_BOX.y + NAME_BOX.h / 2 - blockHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, NAME_BOX.x + NAME_BOX.w / 2, firstLineY + i * lineHeight);
  });
};

const drawRoleLabel = (ctx: CanvasRenderingContext2D, roleLabel: string) => {
  blotRegion(ctx, ROLE_BLOT.x, ROLE_BLOT.y, ROLE_BLOT.w, ROLE_BLOT.h);
  ctx.font = '800 56px Sora, sans-serif';
  ctx.fillStyle = BRAND.orange;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(roleLabel.toUpperCase(), ROLE_BLOT.x, ROLE_TEXT_Y);
};

const HEADLINE_TEXT: Record<'presenting' | 'speaking' | 'showcase', [string, string]> = {
  presenting: ['I will be', 'presenting'],
  speaking: ['I am', 'speaking'],
  showcase: ["I'm", 'showcasing'],
};

const HEADLINE_CREAM = '#E8E0A8'; // the template's own cream/pale-gold second-line color
const HEADLINE_SWISH_GRAY = '#8A8F98'; // matches the template's own gray swish-arrow stroke

const drawReplacementHeadline = async (ctx: CanvasRenderingContext2D, kind: 'presenting' | 'speaking' | 'showcase') => {
  await ensureHeadlineFont();
  blotRegion(ctx, HEADLINE_BLOT.x, HEADLINE_BLOT.y, HEADLINE_BLOT.w, HEADLINE_BLOT.h);
  const [line1, line2] = HEADLINE_TEXT[kind];
  const line1Y = HEADLINE_BLOT.y + 130;
  const line2Y = HEADLINE_BLOT.y + 250;

  ctx.font = '800 100px "Baloo 2", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = BRAND.orange;
  ctx.fillText(line1, HEADLINE_BLOT.x, line1Y);
  const line1Width = ctx.measureText(line1).width;

  ctx.fillStyle = HEADLINE_CREAM;
  ctx.fillText(line2, HEADLINE_BLOT.x, line2Y);

  // Small bent arrow after line 1 — mirrors the template's own accent next
  // to "I will be" on the baked-in attending headline.
  drawBentArrow(ctx, HEADLINE_BLOT.x + line1Width + 70, line1Y - 60, 56, BRAND.orange);

  // Swish-arrow underline beneath line 2 — mirrors the template's own
  // hand-drawn flourish under "attending".
  drawSwishArrow(ctx, HEADLINE_BLOT.x, line2Y + 70, 310, HEADLINE_SWISH_GRAY);
};

const THEME_FONT = '800 34px Sora, sans-serif';
const THEME_LINE_HEIGHT = 44;
const THEME_MAX_WIDTH = THEME_BLOT.w - 32;

const THEME_BADGE_TEXT: Record<'presenting' | 'speaking' | 'showcase', string> = {
  presenting: 'SESSION',
  speaking: 'SESSION',
  showcase: 'SHOWCASE',
};

const drawReplacementThemeBlock = (
  ctx: CanvasRenderingContext2D,
  kind: 'presenting' | 'speaking' | 'showcase',
  rawLines: string[]
) => {
  // A flat near-white fill, not blotRegion's sampled gradient — this region
  // sits on the bottom card's near-white background, and live testing showed
  // the sampled gradient occasionally picking up a mismatched gray-blue tone
  // here (producing a visibly wrong box instead of blending in). A flat
  // off-white is both simpler and a closer match to its surroundings.
  ctx.fillStyle = '#FDFBF8';
  ctx.fillRect(THEME_BLOT.x, THEME_BLOT.y, THEME_BLOT.w, THEME_BLOT.h);

  const badgeW = 220;
  const badgeH = 52;
  ctx.fillStyle = BRAND.orange;
  roundRectPath(ctx, THEME_BLOT.x, THEME_BLOT.y, badgeW, badgeH, 8);
  ctx.fill();
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = BRAND.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(THEME_BADGE_TEXT[kind], THEME_BLOT.x + badgeW / 2, THEME_BLOT.y + badgeH / 2 + 2);

  ctx.font = THEME_FONT;
  const lines = rawLines.flatMap((line) => wrapText(line, THEME_MAX_WIDTH, (s) => ctx.measureText(s).width));
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const startY = THEME_BLOT.y + badgeH + 56;
  lines.forEach((line, i) => {
    ctx.fillText(line, THEME_BLOT.x, startY + i * THEME_LINE_HEIGHT);
  });
};

// Orchestration — not unit-tested (needs a real 2D canvas context); exercise
// this live in a browser instead. Returns a PNG Blob ready to download/share.
export async function renderEventCard(data: EventCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available in this browser.');

  const template = await loadImage(templateUrl);
  drawImageCover(ctx, template, 0, 0, W, H);

  if (data.photoUrl) {
    await drawPhoto(ctx, data.photoUrl);
  }

  drawName(ctx, data.name);
  drawRoleLabel(ctx, data.roleLabel ?? ROLE_DEFAULT[data.kind]);

  if (data.kind !== 'attending') {
    await drawReplacementHeadline(ctx, data.kind);
    drawReplacementThemeBlock(ctx, data.kind, buildDetailLines(data));
  }

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
