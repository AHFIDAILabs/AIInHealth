import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadApprovedCategories } from './loadCategories.js';
import { computeStats } from './computeStats.js';
import { buildHtml, BASE_WIDTH, type RenderMeta } from './template.js';

// Step 4 of the brief — only ever run after the categorization has been
// human-reviewed (loadApprovedCategories throws loudly if anything is still
// unreviewed, rather than rendering a graphic with gaps in it).
const OUT_DIR = path.resolve(import.meta.dirname, '../out');

// Fixed, already-published Summit facts — not computed from the CSV, but not
// invented either.
const META: RenderMeta = {
  dateLabel: '19–20 October 2026',
  venueLabel: 'TY Danjuma Foundation Building, Abuja',
};

const buildAltText = (stats: ReturnType<typeof computeStats>): string => {
  const sectorSummary = stats.bySector.map((e) => `${e.count} from ${e.label}`).join(', ');
  const virtualNote = stats.virtualCount > 0 ? ` ${stats.virtualCount} are joining virtually.` : '';
  return (
    `Who's Speaking at AI in Health Nigeria Summit 2026 (${META.dateLabel}, ${META.venueLabel}): ` +
    `${stats.totalSpeakers} confirmed speakers from ${stats.organisationCount} organisations across ${stats.sectorCount} sectors — ${sectorSummary}.${virtualNote}`
  );
};

const buildEmailSnippet = (altText: string): string => `<!-- Speaker analytics graphic — paste this table into the email body where the image should appear. -->
<table role="presentation" width="${BASE_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${BASE_WIDTH}px; max-width:100%;">
  <tr>
    <td>
      <img
        src="[IMAGE_URL]"
        width="${BASE_WIDTH}"
        alt="${altText.replace(/"/g, '&quot;')}"
        style="display:block; width:100%; max-width:${BASE_WIDTH}px; height:auto; border:0;"
      />
    </td>
  </tr>
</table>
`;

const run = async () => {
  const speakers = loadApprovedCategories();
  const stats = computeStats(speakers);
  const html = buildHtml(stats, META);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'preview.html'), html, 'utf-8');

  const browser = await chromium.launch();

  // @1x — the actual display size in the email.
  const page1x = await browser.newPage({ viewport: { width: BASE_WIDTH, height: 100 }, deviceScaleFactor: 1 });
  await page1x.setContent(html, { waitUntil: 'networkidle' });
  const buf1x = await page1x.screenshot({ path: path.join(OUT_DIR, 'speaker-analytics.png'), fullPage: true });
  await page1x.close();

  // @2x — same markup, double device pixel ratio, for retina displays.
  const page2x = await browser.newPage({ viewport: { width: BASE_WIDTH, height: 100 }, deviceScaleFactor: 2 });
  await page2x.setContent(html, { waitUntil: 'networkidle' });
  const buf2x = await page2x.screenshot({ path: path.join(OUT_DIR, 'speaker-analytics@2x.png'), fullPage: true });
  await page2x.close();

  await browser.close();

  const altText = buildAltText(stats);
  fs.writeFileSync(path.join(OUT_DIR, 'alt-text.txt'), altText + '\n', 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'email-snippet.html'), buildEmailSnippet(altText), 'utf-8');

  const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;
  console.log('\n=== Computed counts ===');
  console.log(`Total speakers: ${stats.totalSpeakers}`);
  console.log(`Distinct organisations: ${stats.organisationCount}`);
  console.log(`Sectors represented: ${stats.sectorCount}`);
  if (stats.virtualCount > 0) console.log(`Joining virtually: ${stats.virtualCount}`);
  console.log('\nBy sector:');
  for (const e of stats.bySector) console.log(`  ${e.label}: ${e.count}`);
  console.log('\nBy seniority:');
  for (const e of stats.bySeniority) console.log(`  ${e.label}: ${e.count}`);
  console.log('\n=== Files written ===');
  console.log(`out/speaker-analytics.png      (${kb(buf1x.length)}, ${BASE_WIDTH}px)`);
  console.log(`out/speaker-analytics@2x.png   (${kb(buf2x.length)}, ${BASE_WIDTH * 2}px)`);
  console.log('out/email-snippet.html');
  console.log('out/alt-text.txt');
  console.log('out/preview.html (for your own visual check in a browser)');

  if (buf1x.length > 1024 * 1024 || buf2x.length > 1024 * 1024) {
    console.warn('\n⚠ One of the exported PNGs is over 1MB — brief asked to keep each under that.');
  }
};

run();
