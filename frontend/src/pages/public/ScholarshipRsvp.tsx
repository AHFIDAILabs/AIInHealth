import { CalendarCheck2 } from 'lucide-react';
import { PageHero, EmptyState } from '../../design-system/patterns';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';

// Was the Sponsored Delegate Pass seat-absorption RSVP link
// (backend/src/controllers/scholarshipApplication.controller.ts's rsvp()) —
// clicking through used to immediately approve the application and issue a
// real access code. The Summit has already taken place, so that approval
// means nothing now; this page no longer calls that endpoint at all. See
// AttendeeRsvpConfirm.tsx's comment for the full reasoning.
export const ScholarshipRsvp = () => (
  <>
    <SEO
      title="Confirm Your Seat"
      description="This link was for confirming a Sponsored Delegate Pass for the AI in Health Summit 2026, which has already taken place."
      path="/sponsored-delegates/rsvp"
      noindex
    />
    <PageHero eyebrow="Sponsored Delegate Pass" title="AI in Health Summit 2026" />

    <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
      <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
          <EmptyState
            icon={CalendarCheck2}
            title="This Summit Has Already Taken Place"
            body="The AI in Health Summit 2026 ran on 19–20 October 2026, so there's no pass left to confirm on this link. We'd love to see you at the next edition."
            action={<ButtonLink to="/2027" variant="primary">Join the 2027 List</ButtonLink>}
          />
        </div>
      </Reveal>
    </section>
  </>
);
