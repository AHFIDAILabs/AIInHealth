// Design-system patterns entry point. New code should import from here.
//
// SpeakerModal, SessionRsvpModal and AbujaSkyline still physically live under
// components/ui/ — same reasoning as primitives/index.ts: SpeakerModal and
// SessionRsvpModal are also used by the delegate portal (out of scope for
// this restructure), and AbujaSkyline is used by the retired Home.tsx, which
// stays frozen rather than edited. Re-exported here for a clean import path
// with zero risk to those consumers.
export { SpeakerModal } from '../../components/ui/SpeakerModal';
export { SessionRsvpModal } from '../../components/ui/SessionRsvpModal';
export { AbujaSkyline } from '../../components/ui/AbujaSkyline';

// Physically relocated — public-only usage, safe to move outright.
export { PageHero } from './PageHero';
export { VenueMap } from './VenueMap';
export { EmptyState } from './EmptyState';
