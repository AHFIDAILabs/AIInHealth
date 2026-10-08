import type { HydratedDocument } from 'mongoose';
import { Session, type SessionDoc } from '../../models/Session.model.js';

// "Build My Day" — deliberately NOT an LLM call. This is a scoring/matching
// problem over structured data already in the DB (a session's track against
// the visitor's selected interests), not a generation problem: a plain
// ranking algorithm handles the core function with zero Groq usage, zero
// latency, zero exposure to the shared 1,000/day budget every other feature
// draws from. The rationale line per suggestion is templated from the same
// match data rather than a per-visitor LLM call — see the header note on why
// that's the right call given the real (not spec-assumed) Groq quota this
// account actually has: a public, potentially high-traffic endpoint is
// exactly the one place that quota can't be spent freely.

// Omit first — SessionDoc's own inferred `tracks: ObjectId[]` would otherwise
// conflict with (not replace) this override when intersected directly.
type PopulatedSession = Omit<HydratedDocument<SessionDoc>, 'tracks'> & { tracks?: { _id: unknown; name: string; color: string }[] };

export interface RecommendedSession {
  session: PopulatedSession;
  matchedInterests: string[];
  rationale: string;
}

const SPEAKER_FIELDS = 'fullName title photoUrl';
const PARTNER_FIELDS = 'name logoUrl website';

export const buildMyDay = async (interests: string[], day?: 'day1' | 'day2'): Promise<RecommendedSession[]> => {
  const normalizedInterests = new Set(interests.map((i) => i.trim().toLowerCase()).filter(Boolean));
  if (normalizedInterests.size === 0) return [];

  const filter: Record<string, unknown> = { isPublished: true };
  if (day) filter.day = day;

  const sessions = (await Session.find(filter)
    .sort({ day: 1, startTime: 1 })
    .populate({ path: 'speakers', select: SPEAKER_FIELDS, match: { isPublished: true } })
    .populate({ path: 'partners', select: PARTNER_FIELDS, match: { isPublished: true } })
    .populate('tracks', 'name color')) as unknown as PopulatedSession[];

  // Score: a session matches on EVERY one of its tracks that's also a
  // selected interest — a session can now belong to several tracks at once.
  const scored = sessions
    .map((session) => {
      const matchedInterests = (session.tracks ?? [])
        .filter((tr) => normalizedInterests.has(tr.name.toLowerCase()))
        .map((tr) => tr.name);
      return { session, matchedInterests };
    })
    .filter((s) => s.matchedInterests.length > 0);

  // Concurrent sessions (same day+startTime) are mutually exclusive for one
  // visitor — keep only the best match per slot, same grouping the public
  // Agenda page's own timeline uses for "what's happening at the same time."
  const bySlot = new Map<string, (typeof scored)[number]>();
  for (const entry of scored) {
    const key = `${entry.session.day}|${entry.session.startTime}`;
    const existing = bySlot.get(key);
    if (!existing || entry.matchedInterests.length > existing.matchedInterests.length) {
      bySlot.set(key, entry);
    }
  }

  return Array.from(bySlot.values())
    .sort((a, b) => a.session.day.localeCompare(b.session.day) || a.session.startTime.localeCompare(b.session.startTime))
    .map(({ session, matchedInterests }) => ({
      session,
      matchedInterests,
      rationale: `Recommended because it covers ${matchedInterests.join(' and ')}, which you selected.`,
    }));
};
