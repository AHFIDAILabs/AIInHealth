import { Speaker } from '../../models/Speaker.model.js';
import { VENUE_NAME, VENUE_STREET_ADDRESS, VENUE_CITY } from '../../config/venue.js';

export interface FactChunk {
  sourceDocument: string;
  text: string;
}

// Real calendar days — kept in sync with jobs/sessionReminder.job.ts's own
// DAY_DATES by hand (no shared constants file between the two; this event
// only ever has these two fixed days, same accepted-duplication tradeoff as
// config/venue.ts's own comment on mirroring the frontend's lib/siteInfo.ts).
const EVENT_DATE_RANGE = 'Monday–Tuesday, 19–20 October 2026';

// Smaller than a typical admin-curated chunk on purpose — a long list of
// names/titles dilutes a sentence embedding's signal badly (verified live:
// a 15-speaker chunk scored 0.047 cosine similarity against "who are the
// speakers", an essentially unrelated-looking score, purely from list
// length; a 2-speaker chunk with the same framing scored 0.20-0.34).
// Smaller groups keep each chunk's embedding meaningfully "about speakers".
const SPEAKERS_PER_CHUNK = 8;

// Always-available factual context for "Ask the Concept Note" (rag.service.ts).
// Unlike KnowledgeChunk (admin-curated prose, can be genuinely empty), this
// is generated fresh from the live database and site constants on every
// call — so a visitor can get a correct answer to "when/where is it" or
// "who's speaking" even before an admin has typed a single knowledge chunk,
// since those facts are already public elsewhere on the site (Agenda,
// Speakers page) and shouldn't need retyping into a chunk to be answerable
// here too.
//
// These are embedded and folded into the SAME top-K relevance ranking as
// real KnowledgeChunks (rag.service.ts), not force-injected into every
// answer — an unrelated question ("how do I register") shouldn't spend the
// answer's token budget on an irrelevant speaker roster just because it
// exists.
export const getSiteFactsChunks = async (): Promise<FactChunk[]> => {
  const chunks: FactChunk[] = [
    {
      sourceDocument: 'Event Facts',
      text: `The AI in Health Summit 2026 takes place on ${EVENT_DATE_RANGE}, at ${VENUE_NAME}, ${VENUE_STREET_ADDRESS}, ${VENUE_CITY}.`,
    },
  ];

  const speakers = await Speaker.find({ isPublished: true }).select('fullName title organization track').sort({ order: 1 });
  for (let i = 0; i < speakers.length; i += SPEAKERS_PER_CHUNK) {
    const group = speakers.slice(i, i + SPEAKERS_PER_CHUNK);
    const lines = group.map((s) => `- ${s.fullName}, ${s.title}${s.organization ? ` (${s.organization})` : ''} — track: ${s.track}`);
    // The question-style opening sentence measurably improves this chunk's
    // embedding relevance for "who is speaking"-shaped questions (a bare
    // list of names/titles alone embeds only weakly related to that
    // question, even though it's the correct answer) — a plain framing
    // sentence gives the sentence-embedding model something that actually
    // resembles the question it needs to match.
    chunks.push({
      sourceDocument: 'Confirmed Speakers',
      text: `Who is speaking, presenting, or attending as a panelist at the AI in Health Summit 2026? This is the list of confirmed speakers, presenters, and panelists, with their names, job titles, and organizations:\n${lines.join('\n')}`,
    });
  }

  return chunks;
};
