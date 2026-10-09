/**
 * scripts/importAgendaV1.ts
 *
 * One-time import of "Draft Agenda Programme V1" (the updated conference
 * agenda PDF) into the live Session/Track/Speaker/Partner collections.
 *
 * This reconciles the PDF against what was already live rather than
 * replacing anything wholesale — most sessions already existed with real
 * speakers/partners attached; this only touches what the PDF actually adds
 * or changes, matched by (day, room, startTime) rather than by title (titles
 * are exactly what's being filled in for several of these).
 *
 * Every content/scope decision below was confirmed with the user first
 * (track renaming, the GIZ→PSHAN swap, publishing placeholder-heavy
 * sessions, and Dr. Kakanfo's organization for this credit) — see this
 * script's companion PR/conversation for the reasoning. Decisions NOT
 * explicitly confirmed (new speakers' track tag, which orgs become session
 * Partners vs. just description text, leaving Keynote III's AHFID partner
 * untouched) are noted inline as judgment calls, each individually small
 * and easily corrected later from the admin UI if wrong.
 *
 * Defaults to a dry run (prints every change, writes nothing) — pass
 * --apply to perform the real update.
 *
 * Usage:
 *   npx tsx src/scripts/importAgendaV1.ts          # dry run
 *   npx tsx src/scripts/importAgendaV1.ts --apply  # real update
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Session } from '../models/Session.model.js';
import { Track } from '../models/Track.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Partner } from '../models/Partner.model.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

// ---------------------------------------------------------------------------
// 1. Track renames — confirmed: rename these 5 to the PDF's short official
// names; "Local Innovation Ecosystems & Country-led AI Adoption" is
// deliberately left untouched (not part of the PDF's 5-track list at all).
// ---------------------------------------------------------------------------
const TRACK_RENAMES: { id: string; from: string; to: string }[] = [
  { id: '6aabc892fb010c2545f4afc5', from: 'National AI-in-Health Strategy, Governance & Regulatory Frameworks', to: 'Country AI-in-Health Governance' },
  { id: '6aabc892fb010c2545f4afc8', from: 'Strengthening Health Systems Through AI-enabled Service Delivery', to: 'Applied Clinical AI' },
  { id: '6aabc893fb010c2545f4afcb', from: 'Data Ecosystems, Infrastructure & Interoperability', to: 'Federated AI Systems & Data Sovereignty' },
  { id: '6aabc893fb010c2545f4afce', from: 'AI for Public Health Intelligence & National Preparedness', to: 'Public Health Intelligence & Disease Programs' },
];
// Track E ("Innovation Showcase & Pathways to Scale", id 6ab193c7814aeb819b0b4390)
// already matches the PDF exactly — no rename needed.

// ---------------------------------------------------------------------------
// 2. Speaker update — confirmed: Dr. Kakanfo holds AI4SID for this credit
// specifically; nothing else about his record changes. This speaker is only
// referenced by the one Welcome Remarks session, so this has no other effect.
// ---------------------------------------------------------------------------
const SPEAKER_UPDATES: { id: string; fullName: string; set: Record<string, string> }[] = [
  {
    id: '6a99827723bf521fb723bcf3',
    fullName: 'Dr Kunle Kakanfo',
    set: { organization: 'Artificial Intelligence for Social Impact & Development (AI4SID)' },
  },
];

// ---------------------------------------------------------------------------
// 3. New speakers — real named individuals newly appearing in this revision
// (never create placeholder "Speaker A"/"Judge A" records — those stay as
// empty speakers[] until real names are confirmed). `track` is a required
// field on Speaker (used for the public speaker directory's own filter, not
// tied to which session they appear in) — defaulted to Track A (governance)
// for both as a reasonable judgment call; easy to correct in the admin UI.
// ---------------------------------------------------------------------------
const NEW_SPEAKERS: { fullName: string; title: string; organization: string; track: string; order: number }[] = [
  {
    fullName: 'Dr. Obi Adigwe',
    title: 'National Coordinator',
    organization: 'National Health Technology & Data Analytics Office (NHTDAO)',
    track: 'Country AI-in-Health Governance',
    order: 30,
  },
  {
    fullName: "Dr. 'Bosun Tijani",
    title: 'Minister of Communications, Innovation and Digital Economy',
    organization: 'Federal Republic of Nigeria',
    track: 'Country AI-in-Health Governance',
    order: 31,
  },
];

// ---------------------------------------------------------------------------
// 4. New partners — organizations named in the PDF with no existing Partner
// record. Created minimal (name only, isPublished: true, matching how 48 of
// the 50 existing partners are already published).
// ---------------------------------------------------------------------------
const NEW_PARTNERS: string[] = [
  'Women in Healthcare Network (WIHCN)',
  'Women in Public Health Leadership for Africa (WiPHLA)',
  'Medical Women Association of Nigeria (MWAN)',
  'Village Reach',
  'World Intellectual Property Organization (WIPO)',
  'Robomed',
  'NISA Premier',
  'Redeemers Health Village',
  'Transform Health',
  'Zipline International Inc.',
];

// ---------------------------------------------------------------------------
// 5. Updates to EXISTING sessions — matched by _id (found via the day/room/
// startTime key during research), each with an explicit before→after.
// ---------------------------------------------------------------------------
interface SessionUpdate {
  id: string;
  label: string; // for the dry-run log only
  set: {
    title?: string;
    format?: string;
    tracks?: string[]; // track NAMES (post-rename), resolved to ids at runtime
    partners?: string[]; // partner NAMES, resolved to ids at runtime (existing + newly-created)
    startTime?: string;
    endTime?: string;
    room?: string;
    description?: string;
  };
}

const SESSION_UPDATES: SessionUpdate[] = [
  {
    id: '6ab19343814aeb819b0b4377',
    label: 'Day1 9:00 Pre-Summit Special Session (Women in AI & Health)',
    set: { partners: ['Women in Healthcare Network (WIHCN)', 'Women in Public Health Leadership for Africa (WiPHLA)', 'Medical Women Association of Nigeria (MWAN)'] },
  },
  {
    // Confirmed: GIZ's "[Title to be confirmed]" breakout at this exact slot
    // is replaced by PSHAN's named panel — GIZ doesn't appear anywhere else
    // in this revision.
    id: '6ab9fdb1f3247d6b5608cbfd',
    label: "Day1 15:00 Breakout Room 1 — GIZ placeholder → PSHAN's named panel",
    set: {
      title: "Before the Algorithm: Building Nigeria's Patient Identity and Trust Layer for Health AI That Works",
      format: 'Panel Session',
      tracks: ['Country AI-in-Health Governance', 'Federated AI Systems & Data Sovereignty'], // Track A + C
      partners: ['PSHAN'],
    },
  },
  {
    id: '6ab9ff7df3247d6b5608ccd9',
    label: 'Day1 15:00 Breakout Room 2 (Digital Readiness panel) — add Track A + Village Reach',
    set: {
      tracks: ['Public Health Intelligence & Disease Programs', 'Country AI-in-Health Governance'], // Track D + A
      partners: ['Development Delivery Partners: DDP', 'Village Reach'],
    },
  },
  {
    id: '6aba0023f3247d6b5608cce9',
    label: 'Day1 15:00 Breakout Room 3 (Cardiovascular AI case study) — partner swap',
    set: { partners: ['Africa Hub for Innovation and Development', 'University of Abuja'] }, // was AHFID + AIMM Lab; PDF names Univ. of Abuja instead of AIMM Lab here
  },
  {
    id: '6abb80568ed9014c270b07e7',
    label: 'Day1 16:30 Poster Walk — room name correction',
    set: { room: 'Exhibition Ground · Poster Gallery' }, // was "Innovation Pavilion"
  },
  {
    id: '6abb894e8ed9014c270b0922',
    label: 'Day2 8:00 Oral Abstracts 4 (Best-of) — tag Track E (cross-track, judgment call)',
    set: { tracks: ['Innovation Showcase & Pathways to Scale'] },
  },
  {
    id: '6ac0c9985a5a3d750cfc6a11',
    label: 'Day2 9:30 Breakout Room 2 — was mistagged to the untouched 6th track; PDF says Track E + B',
    set: { tracks: ['Innovation Showcase & Pathways to Scale', 'Applied Clinical AI'] },
  },
  {
    id: '6ac4d14994d877548beff938',
    label: 'Day2 Keynote III — time correction (was 12:05–12:20, PDF says 12:20–12:40); AHFID partner left as-is (blank in PDF detail table, but plausibly still the implicit host — judgment call)',
    set: { startTime: '12:20', endTime: '12:40' },
  },
];

// ---------------------------------------------------------------------------
// 6. Brand-new sessions — everything in Day 2's afternoon (12:45 PM onward),
// which doesn't exist in the DB at all yet, plus the one Day1 description
// note. Partner/speaker/track names resolved at runtime same as above.
// ---------------------------------------------------------------------------
interface NewSession {
  day: 'day1' | 'day2';
  startTime: string;
  endTime: string;
  title: string;
  tracks: string[];
  format: string;
  room: string;
  description?: string;
  speakers?: string[]; // fullName, resolved at runtime
  partners?: string[];
  cardStyle: 'standard' | 'featured' | 'spotlight' | 'break';
}

const NEW_SESSIONS: NewSession[] = [
  {
    day: 'day2', startTime: '12:45', endTime: '14:00',
    title: 'Investment and Sustainable Funding for AI in Health',
    tracks: ['Innovation Showcase & Pathways to Scale'], format: 'Panel Session', room: 'Main Hall',
    partners: ['Africa Hub for Innovation and Development'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '12:45', endTime: '14:00',
    title: "Data Before Models: Building Africa's AI-Ready Public Health Infrastructure",
    tracks: ['Federated AI Systems & Data Sovereignty'], format: 'Panel Session', room: 'Breakout Room 1',
    partners: ['APIN Public Health Initiatives'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '12:45', endTime: '14:00',
    title: 'AI-enabled Health Innovation and Intellectual Property (IP): From Idea to Impact (2026)',
    tracks: ['Innovation Showcase & Pathways to Scale'], format: 'Panel Session', room: 'Breakout Room 2',
    partners: ['World Intellectual Property Organization (WIPO)', 'Africa Hub for Innovation and Development'], cardStyle: 'spotlight',
  },
  {
    day: 'day2', startTime: '12:45', endTime: '14:00',
    title: '[Title to be confirmed]',
    tracks: ['Federated AI Systems & Data Sovereignty'], format: 'Panel Session', room: 'Breakout Room 3',
    partners: ["United Nations Children's Fund"], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '12:45', endTime: '14:00',
    title: 'Innovation Pitch Session 2',
    tracks: ['Innovation Showcase & Pathways to Scale'], format: 'Innovation Showcase', room: 'Innovation Stage',
    cardStyle: 'spotlight',
  },
  {
    day: 'day2', startTime: '14:00', endTime: '14:30',
    title: 'Brunch & Networking · Poster Voting Closes',
    tracks: [], format: 'Brunch', room: 'Exhibition Ground', cardStyle: 'break',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: 'Artificial Intelligence & Robotics in Clinical / Surgical Care',
    tracks: ['Applied Clinical AI'], format: 'Panel Session', room: 'Main Hall',
    partners: ['Robomed', 'NISA Premier', 'Redeemers Health Village'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: 'From AI in Health Pilots to National Scale',
    tracks: ['Innovation Showcase & Pathways to Scale'], format: 'Panel Session', room: 'Breakout Room 1',
    partners: ['eHealth Africa', 'Solina Centre for International Development and Research (SCIDaR)', 'Sydani Group'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: '[Title to be confirmed]',
    tracks: ['Federated AI Systems & Data Sovereignty'], format: 'Breakout Session', room: 'Breakout Room 2',
    partners: ['The Africa Centres for Disease Control and Prevention', 'Transform Health'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: '[Title to be confirmed]',
    tracks: ['Public Health Intelligence & Disease Programs'], format: 'Panel Session', room: 'Breakout Room 3',
    partners: ['Zipline International Inc.'], cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: '★ High-Level Political Roundtable Dialogue',
    tracks: ['Country AI-in-Health Governance'], format: 'Roundtable Dialogue', room: 'Roundtable Room',
    cardStyle: 'spotlight',
  },
  {
    day: 'day2', startTime: '14:30', endTime: '15:30',
    title: 'Startup Showcase Round 2',
    tracks: ['Innovation Showcase & Pathways to Scale'], format: 'Innovation Showcase', room: 'Innovation Stage',
    cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '15:35', endTime: '15:50',
    title: 'Summit Address — [Title to be confirmed]',
    tracks: [], format: 'Plenary', room: 'Main Hall',
    speakers: ['Dr. Obi Adigwe'], cardStyle: 'spotlight',
  },
  {
    day: 'day2', startTime: '15:50', endTime: '16:35',
    title: 'Ministerial Remarks & Special Goodwill Messages',
    tracks: [], format: 'Plenary', room: 'Main Hall',
    // Goodwill-message orgs (CHAI, UNICEF, WHO, GIZ, FCDO, US Dept of State)
    // are a passing verbal mention, not logo-bearing co-hosts like the
    // Partners elsewhere — kept as description text rather than creating/
    // attaching Partner records for a one-line shoutout (judgment call).
    description: 'Special Goodwill Messages: Clinton Health Access Initiative (CHAI), UNICEF, World Health Organization (WHO), GIZ, Foreign Commonwealth Development Office (FCDO), US Department of State.',
    speakers: ['Dr. Iziaq Adekunle Salako', "Dr. 'Bosun Tijani"],
    cardStyle: 'spotlight',
  },
  {
    day: 'day2', startTime: '16:35', endTime: '16:50',
    title: 'Best Abstract and Innovator Awards',
    tracks: [], format: 'Plenary', room: 'Main Hall', cardStyle: 'standard',
  },
  {
    day: 'day2', startTime: '16:50', endTime: '17:00',
    title: 'Closing Remarks',
    tracks: [], format: 'Plenary', room: 'Main Hall', cardStyle: 'standard',
  },
];

// Dr. Iziaq Adekunle Salako already exists — referenced by fullName above,
// resolved at runtime against the existing Speaker collection.

export const run = async (): Promise<void> => {
  await connectDB();
  logger.info(`=== importAgendaV1 ${apply ? '(APPLY)' : '(DRY RUN)'} ===`);

  // --- 1. Track renames ---
  for (const t of TRACK_RENAMES) {
    const track = await Track.findById(t.id);
    if (!track) {
      logger.warn(`Track ${t.id} not found — skipping rename "${t.from}" → "${t.to}"`);
      continue;
    }
    if (track.name === t.to) {
      logger.info(`Track already renamed: "${t.to}"`);
      continue;
    }
    logger.info(`Track rename: "${track.name}" → "${t.to}"`);
    if (apply) {
      track.name = t.to;
      await track.save();
    }
  }

  // --- 2. Speaker org update ---
  for (const s of SPEAKER_UPDATES) {
    const speaker = await Speaker.findById(s.id);
    if (!speaker) {
      logger.warn(`Speaker ${s.id} (${s.fullName}) not found — skipping`);
      continue;
    }
    for (const [key, value] of Object.entries(s.set)) {
      const before = (speaker as unknown as Record<string, unknown>)[key];
      if (before === value) continue;
      logger.info(`Speaker "${s.fullName}" ${key}: "${before}" → "${value}"`);
      if (apply) (speaker as unknown as Record<string, unknown>)[key] = value;
    }
    if (apply) await speaker.save();
  }

  // --- 3. New speakers ---
  const speakerIdByName = new Map<string, string>();
  for (const existing of await Speaker.find().select('fullName')) {
    speakerIdByName.set(existing.fullName, existing.id);
  }
  for (const s of NEW_SPEAKERS) {
    if (speakerIdByName.has(s.fullName)) {
      logger.info(`Speaker already exists, skipping create: "${s.fullName}"`);
      continue;
    }
    logger.info(`CREATE speaker: "${s.fullName}" — ${s.title}, ${s.organization}`);
    if (apply) {
      const created = await Speaker.create({ ...s, isPublished: true });
      speakerIdByName.set(s.fullName, created.id);
    } else {
      speakerIdByName.set(s.fullName, 'DRY-RUN-PLACEHOLDER'); // lets downstream session resolution log correctly without writing
    }
  }

  // --- 4. New partners ---
  const partnerIdByName = new Map<string, string>();
  for (const existing of await Partner.find().select('name')) {
    partnerIdByName.set(existing.name, existing.id);
  }
  for (const name of NEW_PARTNERS) {
    if (partnerIdByName.has(name)) {
      logger.info(`Partner already exists, skipping create: "${name}"`);
      continue;
    }
    logger.info(`CREATE partner: "${name}"`);
    if (apply) {
      const created = await Partner.create({ name, isPublished: true });
      partnerIdByName.set(name, created.id);
    } else {
      partnerIdByName.set(name, 'DRY-RUN-PLACEHOLDER'); // lets downstream session resolution log correctly without writing
    }
  }

  // Track id lookup by the (post-rename) name used in the data above. In
  // dry-run mode the rename above never actually wrote, so the DB still has
  // the OLD names — alias each new name to the same id so downstream
  // resolution/logging works identically in both modes.
  const trackIdByName = new Map<string, string>();
  for (const t of await Track.find().select('name')) trackIdByName.set(t.name, t.id);
  for (const t of TRACK_RENAMES) {
    const id = trackIdByName.get(t.to) ?? trackIdByName.get(t.from);
    if (id) trackIdByName.set(t.to, id);
  }

  const resolveTrackIds = (names: string[]): string[] =>
    names.map((n) => {
      const id = trackIdByName.get(n);
      if (!id) throw new Error(`Unknown track name "${n}" — check TRACK_RENAMES ran first`);
      return id;
    });
  const resolvePartnerIds = (names: string[]): string[] =>
    names.map((n) => {
      const id = partnerIdByName.get(n);
      if (!id) throw new Error(`Unknown partner name "${n}" — add it to NEW_PARTNERS or check spelling`);
      return id;
    });
  const resolveSpeakerIds = (names: string[]): string[] =>
    names.map((n) => {
      const id = speakerIdByName.get(n);
      if (!id) throw new Error(`Unknown speaker name "${n}" — add it to NEW_SPEAKERS or check spelling`);
      return id;
    });

  // --- 5. Updates to existing sessions ---
  for (const u of SESSION_UPDATES) {
    const session = await Session.findById(u.id);
    if (!session) {
      logger.warn(`Session ${u.id} (${u.label}) not found — skipping`);
      continue;
    }
    logger.info(`--- ${u.label} ---`);
    const update: Record<string, unknown> = {};
    if (u.set.title !== undefined && u.set.title !== session.title) {
      logger.info(`  title: "${session.title}" → "${u.set.title}"`);
      update.title = u.set.title;
    }
    if (u.set.format !== undefined && u.set.format !== session.format) {
      logger.info(`  format: "${session.format}" → "${u.set.format}"`);
      update.format = u.set.format;
    }
    if (u.set.startTime !== undefined && u.set.startTime !== session.startTime) {
      logger.info(`  startTime: "${session.startTime}" → "${u.set.startTime}"`);
      update.startTime = u.set.startTime;
    }
    if (u.set.endTime !== undefined && u.set.endTime !== session.endTime) {
      logger.info(`  endTime: "${session.endTime}" → "${u.set.endTime}"`);
      update.endTime = u.set.endTime;
    }
    if (u.set.room !== undefined && u.set.room !== session.room) {
      logger.info(`  room: "${session.room}" → "${u.set.room}"`);
      update.room = u.set.room;
    }
    if (u.set.description !== undefined && u.set.description !== session.description) {
      logger.info(`  description updated`);
      update.description = u.set.description;
    }
    if (u.set.tracks !== undefined) {
      const newIds = resolveTrackIds(u.set.tracks);
      const currentIds = session.tracks.map((t) => t.toString()).sort();
      if (JSON.stringify([...newIds].sort()) !== JSON.stringify(currentIds)) {
        logger.info(`  tracks → [${u.set.tracks.join(', ')}]`);
        update.tracks = newIds;
      }
    }
    if (u.set.partners !== undefined) {
      const newIds = resolvePartnerIds(u.set.partners);
      const currentIds = session.partners.map((p) => p.toString()).sort();
      if (JSON.stringify([...newIds].sort()) !== JSON.stringify(currentIds)) {
        logger.info(`  partners → [${u.set.partners.join(', ')}]`);
        update.partners = newIds;
      }
    }
    if (Object.keys(update).length === 0) {
      logger.info('  (already matches — no change)');
      continue;
    }
    if (apply) await Session.updateOne({ _id: u.id }, { $set: update });
  }

  // --- 6. Brand-new sessions ---
  for (const s of NEW_SESSIONS) {
    const exists = await Session.exists({ day: s.day, room: s.room, startTime: s.startTime });
    if (exists) {
      logger.warn(`A session already exists at ${s.day} ${s.startTime} in "${s.room}" — skipping create of "${s.title}" (check for a duplicate)`);
      continue;
    }
    logger.info(`CREATE session: ${s.day} ${s.startTime}-${s.endTime} "${s.title}" (${s.room})`);
    if (apply) {
      await Session.create({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        tracks: resolveTrackIds(s.tracks),
        format: s.format,
        room: s.room,
        description: s.description,
        speakers: s.speakers ? resolveSpeakerIds(s.speakers) : [],
        partners: s.partners ? resolvePartnerIds(s.partners) : [],
        cardStyle: s.cardStyle,
        isPublished: true,
        requiresRsvp: false,
      });
    }
  }

  logger.info(`=== ${apply ? 'Applied' : 'Dry run complete — pass --apply to perform these changes'} ===`);
  await disconnectDB();
};

if (isMain) {
  run().catch(async (err) => {
    logger.error({ err }, 'importAgendaV1 failed');
    await disconnectDB();
    process.exit(1);
  });
}
