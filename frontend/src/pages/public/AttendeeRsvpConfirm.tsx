import { CalendarCheck2 } from 'lucide-react';
import { PageHero, EmptyState } from '../../design-system/patterns';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';

// Was the pending-attendee RSVP reconfirmation link
// (backend/src/controllers/registrationRsvp.controller.ts's redeem()).
// The AI in Health Summit 2026 has already taken place, so confirming
// interest in attending it no longer means anything — this page no longer
// calls that endpoint at all, regardless of the token in the URL. See
// docs/AIHS-2027-platform-brief.md's "Post-event home and archive routes"
// checkpoint: of ~870 still-unredeemed RSVP links across all four RSVP
// flows, silently redirecting them was judged more confusing than an honest
// one-line notice — someone clicking "confirm my seat" months later should
// be told why, not dropped on an unrelated form with no explanation.
export const AttendeeRsvpConfirm = () => (
  <>
    <SEO title="Still Joining Us?" description="This link was for confirming attendance at the AI in Health Summit 2026, which has already taken place." path="/rsvp" noindex />
    <PageHero eyebrow="AI in Health Summit 2026" title="Still Joining Us?" />

    <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
      <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
          <EmptyState
            icon={CalendarCheck2}
            title="This Summit Has Already Taken Place"
            body="The AI in Health Summit 2026 ran on 19–20 October 2026, so there's nothing left to confirm on this link. We'd love to see you at the next edition."
            action={<ButtonLink to="/2027" variant="primary">Join the 2027 List</ButtonLink>}
          />
        </div>
      </Reveal>
    </section>
  </>
);
