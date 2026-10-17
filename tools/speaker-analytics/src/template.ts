import fs from 'node:fs';
import path from 'node:path';
import { BRAND, SECTOR_COLOR_ORDER } from './brand.js';
import { SECTOR_DISPLAY_ORDER } from './categories.js';
import type { SpeakerStats } from './computeStats.js';

const ASSETS_DIR = path.resolve(import.meta.dirname, '../assets');
const toDataUri = (file: string): string => `data:image/png;base64,${fs.readFileSync(path.join(ASSETS_DIR, file)).toString('base64')}`;

// Stable color per sector regardless of which sectors actually have
// speakers this run — keyed by position in the brief's own listed order.
const sectorColor = (sector: string): string => {
  const i = SECTOR_DISPLAY_ORDER.indexOf(sector as (typeof SECTOR_DISPLAY_ORDER)[number]);
  return SECTOR_COLOR_ORDER[i] ?? BRAND.color.navySecondary;
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface RenderMeta {
  dateLabel: string;
  venueLabel: string;
}

// Base canvas is 600px wide (the email display width) — the @2x export just
// renders this same markup in a viewport scaled 2x via Playwright's
// deviceScaleFactor, not a second template, so both exports are guaranteed
// pixel-identical in layout.
export const BASE_WIDTH = 600;

// Caps the "Featured Organisations" chip grid so the graphic stays a
// reasonable email-scroll length as the speaker list grows — the headline
// "Organisations" stat and alt text always reflect the TRUE full count
// regardless of this cap (see computeStats.ts).
const MAX_ORGANISATIONS_SHOWN = 40;

export const buildHtml = (stats: SpeakerStats, meta: RenderMeta): string => {
  const maxSectorCount = Math.max(...stats.bySector.map((e) => e.count));
  const maxSeniorityCount = Math.max(...stats.bySeniority.map((e) => e.count));

  const statTiles = [
    { label: 'Speakers', value: stats.totalSpeakers },
    { label: 'Organisations', value: stats.organisationCount },
    { label: 'Sectors', value: stats.sectorCount },
    ...(stats.virtualCount > 0 ? [{ label: 'Joining Virtually', value: stats.virtualCount }] : []),
  ];

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${BRAND.font.body}; background: ${BRAND.color.offwhite}; }
  .canvas { width: ${BASE_WIDTH}px; background: ${BRAND.color.offwhite}; }
  .header { background: ${BRAND.color.navy}; padding: 28px 28px 24px; }
  .header img { height: 28px; display: block; margin-bottom: 16px; }
  .header h1 {
    font-family: ${BRAND.font.display}; font-weight: 700; color: #ffffff;
    font-size: 22px; line-height: 1.3;
  }
  .header p { color: #CBD5E1; font-size: 14px; margin-top: 8px; }
  .section { padding: 24px 28px; }
  .section-title {
    font-family: ${BRAND.font.display}; font-weight: 700; color: ${BRAND.color.navy};
    font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 14px;
  }
  .stats-row { display: flex; gap: 10px; padding: 0 28px; margin-top: -20px; }
  .stat-tile {
    flex: 1; background: #ffffff; border-radius: 10px; padding: 16px 10px; text-align: center;
    box-shadow: 0 2px 8px rgba(15,23,42,0.08);
  }
  .stat-tile .value { font-family: ${BRAND.font.display}; font-weight: 700; font-size: 26px; color: ${BRAND.color.orange}; }
  .stat-tile .label { font-size: 13px; color: ${BRAND.color.navy}; margin-top: 2px; font-weight: 600; }
  .bar-row { display: flex; align-items: center; margin-bottom: 12px; }
  .bar-label { width: 190px; font-size: 14px; color: ${BRAND.color.navy}; font-weight: 600; padding-right: 10px; line-height: 1.25; }
  .bar-track { flex: 1; background: #E7EAF0; border-radius: 6px; height: 22px; position: relative; }
  .bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; }
  .bar-count { font-size: 14px; font-weight: 700; color: ${BRAND.color.navy}; margin-left: 10px; width: 24px; }
  .seniority-row { display: flex; align-items: center; margin-bottom: 10px; }
  .seniority-label { width: 230px; font-size: 14px; color: ${BRAND.color.navy}; font-weight: 600; padding-right: 10px; line-height: 1.25; }
  .org-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .org-chip {
    background: #ffffff; border: 1px solid #E2E8F0; border-radius: 999px; padding: 7px 14px;
    font-size: 14px; font-weight: 600; color: ${BRAND.color.navy};
  }
  .org-chip-more { background: ${BRAND.color.navy}; border-color: ${BRAND.color.navy}; color: #ffffff; }
  .footer {
    background: ${BRAND.color.navyNav}; padding: 20px 28px; text-align: center;
  }
  .footer .credit { font-size: 14px; color: #94A3B8; }
  .footer .credit b { color: ${BRAND.color.ahfidRed}; }
  .chart-caption { font-size: 13px; color: #64748B; margin-top: -4px; margin-bottom: 16px; line-height: 1.4; }
</style>
</head>
<body>
  <div class="canvas">
    <div class="header">
      <img src="${toDataUri('summit-logo-white.png')}" alt="AI in Health Summit 2026" />
      <h1>Who's Speaking at AI in Health&nbsp;Nigeria Summit&nbsp;2026</h1>
      <p>${esc(meta.dateLabel)} &middot; ${esc(meta.venueLabel)}</p>
    </div>

    <div class="stats-row">
      ${statTiles.map((t) => `<div class="stat-tile"><div class="value">${t.value}</div><div class="label">${esc(t.label)}</div></div>`).join('')}
    </div>

    <div class="section">
      <div class="section-title">Speakers by Sector</div>
      ${
        stats.categorizedSpeakers < stats.totalSpeakers
          ? `<div class="chart-caption">Based on the ${stats.categorizedSpeakers} confirmed speakers with full details on file.</div>`
          : ''
      }
      ${stats.bySector
        .map(
          (e) => `
        <div class="bar-row">
          <div class="bar-label">${esc(e.label)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(e.count / maxSectorCount) * 100}%; background:${sectorColor(e.label)};"></div>
          </div>
          <div class="bar-count">${e.count}</div>
        </div>`
        )
        .join('')}
    </div>

    <div class="section" style="padding-top: 4px;">
      <div class="section-title">Seniority Breakdown</div>
      ${stats.bySeniority
        .map(
          (e) => `
        <div class="seniority-row">
          <div class="seniority-label">${esc(e.label)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(e.count / maxSeniorityCount) * 100}%; background:${BRAND.color.navySecondary};"></div>
          </div>
          <div class="bar-count">${e.count}</div>
        </div>`
        )
        .join('')}
    </div>

    <div class="section" style="padding-top: 4px;">
      <div class="section-title">Featured Organisations</div>
      <div class="org-grid">
        ${stats.organisations
          .slice(0, MAX_ORGANISATIONS_SHOWN)
          .map((o) => `<span class="org-chip">${esc(o)}</span>`)
          .join('')}
        ${
          stats.organisations.length > MAX_ORGANISATIONS_SHOWN
            ? `<span class="org-chip org-chip-more">+${stats.organisations.length - MAX_ORGANISATIONS_SHOWN} more</span>`
            : ''
        }
      </div>
    </div>

    <div class="footer">
      <div class="credit">Convened by <b>AHFID</b> &middot; aiinhealthsummit.org</div>
    </div>
  </div>
</body>
</html>`;
};
