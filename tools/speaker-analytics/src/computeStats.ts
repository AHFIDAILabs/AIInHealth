import type { CategorizedSpeaker } from './loadCategories.js';
import { SECTOR_DISPLAY_ORDER, SENIORITY_DISPLAY_ORDER } from './categories.js';

export interface CountEntry {
  label: string;
  count: number;
}

export interface SpeakerStats {
  totalSpeakers: number;
  // How many of totalSpeakers actually have a real sector/seniority on file
  // — i.e. the number the bySector/bySeniority bars actually sum to. Lets
  // the template caption the charts honestly when this is less than
  // totalSpeakers (some confirmed speakers' profiles are still incomplete).
  categorizedSpeakers: number;
  organisationCount: number;
  sectorCount: number;
  virtualCount: number;
  bySector: CountEntry[];
  bySeniority: CountEntry[];
  // Full distinct list — organisationCount above is always this list's true
  // length, uncapped. The grid only shows the first MAX_ORGANISATIONS_SHOWN
  // (see template.ts) so the email graphic doesn't grow unbounded as the
  // speaker list does; organisationCount and the "+N more" chip stay correct
  // either way since both derive from this same array.
  organisations: string[];
}

// Pure — every number here is a direct count over the approved, human-
// reviewed speaker list. Nothing here invents or estimates anything.
// totalSpeakers counts every row (a real confirmed speaker, whether or not
// we have their bio yet); bySector/bySeniority only sum over speakers who
// actually have a sector/seniority (sector !== null) — an incomplete
// profile counts toward "how many speakers" but can't be charted by a
// category nobody has assigned it.
export const computeStats = (speakers: CategorizedSpeaker[]): SpeakerStats => {
  const sectorCounts = new Map<string, number>();
  const seniorityCounts = new Map<string, number>();
  const organisations = new Set<string>();
  let virtualCount = 0;
  let categorizedSpeakers = 0;

  for (const s of speakers) {
    if (s.sector && s.seniority) {
      categorizedSpeakers += 1;
      sectorCounts.set(s.sector, (sectorCounts.get(s.sector) ?? 0) + 1);
      seniorityCounts.set(s.seniority, (seniorityCounts.get(s.seniority) ?? 0) + 1);
    }
    if (s.organisation) organisations.add(s.organisation);
    if (s.virtual) virtualCount += 1;
  }

  const bySector = SECTOR_DISPLAY_ORDER.filter((sector) => sectorCounts.has(sector)).map((sector) => ({
    label: sector,
    count: sectorCounts.get(sector)!,
  }));
  const bySeniority = SENIORITY_DISPLAY_ORDER.filter((s) => seniorityCounts.has(s)).map((seniority) => ({
    label: seniority,
    count: seniorityCounts.get(seniority)!,
  }));

  return {
    totalSpeakers: speakers.length,
    categorizedSpeakers,
    organisationCount: organisations.size,
    sectorCount: bySector.length,
    virtualCount,
    bySector,
    bySeniority,
    organisations: [...organisations].sort((a, b) => a.localeCompare(b)),
  };
};
