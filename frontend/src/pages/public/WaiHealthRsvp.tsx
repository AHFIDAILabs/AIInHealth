import { CalendarCheck2 } from 'lucide-react';
import { PageHero, EmptyState } from '../../design-system/patterns';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';

// Was the seat-reservation link from the Women in AI & Health Breakfast
// signup email (backend/src/controllers/waiHealth.controller.ts's rsvp()) —
// Day 1's 08:00 Breakfast has already happened, so there's no seat left to
// reserve. See AttendeeRsvpConfirm.tsx's comment for why this is an honest
// notice rather than a silent redirect or the old confirm-flow still firing.
export const WaiHealthRsvp = () => (
  <>
    <SEO
      title="Confirm Your Seat"
      description="This link was for reserving a seat at the Women in AI & Health Breakfast, which has already taken place."
      path="/wai-health-breakfast/rsvp"
      noindex
    />
    <PageHero eyebrow="AI in Health Summit 2026" title="Women in AI & Health Breakfast" />

    <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
      <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
          <EmptyState
            icon={CalendarCheck2}
            title="The Breakfast Has Already Taken Place"
            body="The Women in AI & Health Breakfast ran on Day 1 of the Summit (19 October 2026), so there's no seat left to reserve on this link. We'd love to see you at the next edition."
            action={<ButtonLink to="/2027" variant="primary">Join the 2027 List</ButtonLink>}
          />
        </div>
      </Reveal>
    </section>
  </>
);
