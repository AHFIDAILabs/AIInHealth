// What a printed name tag should say as its role word — a fixed set of 7
// categories management uses on the physical badges, deliberately coarser
// than the internal ticketCategory enum (e.g. international_delegate,
// nigerian_professional, student_researcher, government_official,
// abstract_presenter, abstract_reviewer, invited_delegate, and sponsor
// registrations all print as the one catch-all "Delegate" — there is no
// "Sponsored"/"Invited Guest" wording on a badge; see registrationChannel.ts
// for where that distinction still DOES matter, the admin-facing Registration
// Channels reporting view, which is a separate concern from what gets printed).
export const BADGE_CATEGORIES = ['Delegate', 'Speaker', 'Innovator', 'Exhibitor', 'VIP', 'Organizer', 'Media/Volunteer'] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

interface BadgeCategoryInput {
  type?: string | null;
  ticketCategory?: string | null;
}

// Order matters — each condition is checked only once nothing earlier in
// the list already matched, same precedence idiom as classifyRegistrationChannel.
export const classifyBadgeCategory = (reg: BadgeCategoryInput): BadgeCategory => {
  if (reg.ticketCategory === 'speaker') return 'Speaker';
  if (reg.type === 'innovator') return 'Innovator';
  if (reg.type === 'exhibitor') return 'Exhibitor';
  if (reg.ticketCategory === 'vip') return 'VIP';
  if (reg.type === 'team' || reg.ticketCategory === 'staff') return 'Organizer';
  if (reg.type === 'volunteer' || reg.ticketCategory === 'accredited_media') return 'Media/Volunteer';
  return 'Delegate';
};
