// The open-access compendium reads purely static files from
// frontend/public/compendium/ — no backend API call at all. See backend
// scripts/compendium/exportSnapshot.ts for how these are generated and
// published (a human runs that script locally and commits the output).
//
// current.json is fetched with cache: 'no-cache' so a visitor always
// discovers a newly-published version immediately; the versioned files it
// points at (compendium-<version>.json, search-index-<version>.json) are
// content-addressed by that same version number, so caching them normally is
// safe — a given version's content never changes after it's published.

export interface CompendiumAuthor {
  name: string;
  affiliation: string | null;
  isCorresponding: boolean | null;
  orcid: string | null;
}

export interface CompendiumCorrection {
  date: string;
  note: string;
}

export interface CompendiumAbstractRecord {
  code: string;
  title: string;
  status: 'published' | 'withdrawn';
  authors?: CompendiumAuthor[];
  abstract?: string;
  keywords?: string[];
  track?: string | null;
  presentationType?: string | null;
  sessionRef?: string | null;
  language?: string;
  corrections?: CompendiumCorrection[];
}

export interface CompendiumEdition {
  editionTitle: string | null;
  editionYear: number;
  version: string;
  publishedAt: string | null;
  publisher: string | null;
  licence: { name: string; url: string; confirmed: boolean };
  doi: string | null;
  isbn: string | null;
  pdfUrl: string | null;
  editors: string[];
  foreword: string | null;
  showPlainSummaries: boolean;
}

export interface CompendiumCurrent {
  version: string;
  file: string;
  generatedAt: string;
}

const BASE = '/compendium';

export const fetchCompendiumCurrent = async (): Promise<CompendiumCurrent> => {
  const res = await fetch(`${BASE}/current.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load the compendium.');
  return res.json();
};

export const fetchCompendiumEdition = async (): Promise<CompendiumEdition> => {
  const res = await fetch(`${BASE}/edition.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load edition information.');
  return res.json();
};

export const fetchCompendiumAbstracts = async (file: string): Promise<CompendiumAbstractRecord[]> => {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error('Could not load abstracts.');
  return res.json();
};

// MiniSearch.loadJSON expects the raw serialized string, not a parsed object.
export const fetchCompendiumSearchIndexRaw = async (version: string): Promise<string> => {
  const res = await fetch(`${BASE}/search-index-${version}.json`);
  if (!res.ok) throw new Error('Could not load the search index.');
  return res.text();
};

// Convenience: loads everything a page typically needs in one call.
export const loadCompendium = async (): Promise<{
  edition: CompendiumEdition;
  current: CompendiumCurrent;
  abstracts: CompendiumAbstractRecord[];
}> => {
  const current = await fetchCompendiumCurrent();
  const [edition, abstracts] = await Promise.all([fetchCompendiumEdition(), fetchCompendiumAbstracts(current.file)]);
  return { edition, current, abstracts };
};
