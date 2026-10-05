// Public form spam hardening. Pure, synchronous, no AI calls — these are the
// cheap signals checked on every public Contact/Inquiry/Registration
// submission before anything more expensive (Groq triage, outbound email)
// happens. See contact.controller.ts/inquiry.controller.ts/
// registration.controller.ts for how each endpoint maps its own fields onto
// the shape scoreSubmission expects, and the plan's own rationale for why
// this replaces a would-be Redis-backed velocity check: a Mongo
// countDocuments against the emailCanonical field this same change adds is
// simpler, needs no new infrastructure, and persists across restarts.

export const SPAM_THRESHOLD = 4;

// Gmail ignores dots in the local part and treats `+anything` as a tag, so a
// bot can mint effectively unlimited "unique" addresses from one real inbox
// (e.g. `g.enr.k.r.a.me.2.0.0.1@gmail.com` and `genrakame2001@gmail.com` are
// the exact same mailbox). Collapsing both forms to one canonical value is
// what makes the velocity check and the dot-stuffing signal below actually
// work, and lets the admin UI/backfill group repeat offenders together.
export function canonicalizeEmail(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return `${local}@${domain}`;
}

// Letters-only single token, 12+ chars, 30-80% uppercase. Real names have
// spaces ("Adebayo Okonkwo"), ALL CAPS is excluded (ratio would be 1.0,
// outside the band — a real name someone typed in caps lock shouldn't score),
// and CamelCase brand/product names sit well below 30% uppercase.
const isRandomToken = (s: string): boolean => {
  const t = s.trim();
  if (t.length < 12 || /\s/.test(t) || !/^[A-Za-z]+$/.test(t)) return false;
  const ratio = (t.match(/[A-Z]/g) ?? []).length / t.length;
  return ratio >= 0.3 && ratio <= 0.8;
};

export interface SpamScoreResult {
  score: number;
  reasons: string[];
  isSpam: boolean;
}

export function scoreSubmission(input: { name: string; email: string; message?: string }): SpamScoreResult {
  const reasons: string[] = [];
  let score = 0;

  if (isRandomToken(input.name)) {
    score += 3;
    reasons.push('random-looking name');
  }

  const msg = (input.message ?? '').trim();
  if (msg) {
    if (isRandomToken(msg)) {
      score += 3;
      reasons.push('random-looking message');
    } else if (msg.length >= 12 && !/\s/.test(msg)) {
      score += 2;
      reasons.push('message contains no spaces');
    }
    if (/https?:\/\/|www\./i.test(msg)) {
      score += 1;
      reasons.push('contains link');
    }
  }

  const [local, domain] = input.email.toLowerCase().split('@');
  if ((domain === 'gmail.com' || domain === 'googlemail.com') && (local.match(/\./g) ?? []).length >= 4) {
    score += 2;
    reasons.push('dot-stuffed Gmail address');
  }

  return { score, reasons, isSpam: score >= SPAM_THRESHOLD };
}

// Velocity bump — called by each controller with a count of how many OTHER
// documents in that same collection already share this emailCanonical within
// the last hour (see each controller's own countDocuments call). Kept as a
// separate step (not folded into scoreSubmission) since it needs a DB round
// trip scoreSubmission itself has no business doing.
export function applyVelocityBump(base: SpamScoreResult, recentCount: number): SpamScoreResult {
  if (recentCount < 3) return base;
  const score = base.score + 3;
  return { score, reasons: [...base.reasons, 'repeat submissions from same inbox'], isSpam: score >= SPAM_THRESHOLD };
}
