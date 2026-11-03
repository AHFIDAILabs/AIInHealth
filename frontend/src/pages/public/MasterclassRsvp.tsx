import { CalendarCheck2 } from 'lucide-react';
import { PageHero, EmptyState } from '../../design-system/patterns';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';

// Was the AI in Health Masterclass invite link
// (backend/src/controllers/masterclass.controller.ts's rsvp()) — Day 1 of
// the Summit, 08:00–09:30, already took place, so there's no seat left to
// confirm. See AttendeeRsvpConfirm.tsx's comment for why this is an honest
// notice rather than a silent redirect or the old confirm-flow still firing.
export const MasterclassRsvp = () => (
  <>
    <SEO title="Masterclass RSVP" description="This link was for RSVPing to the AI in Health Masterclass, which has already taken place." path="/masterclass" noindex />
    <PageHero eyebrow="AI in Health Summit 2026" title="AI in Health Masterclass" />

    <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
      <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
          <EmptyState
            icon={CalendarCheck2}
            title="This Masterclass Has Already Taken Place"
            body="The AI in Health Masterclass ran on Day 1 of the Summit (19 October 2026), so there's no seat left to confirm on this link. We'd love to see you at the next edition."
            action={<ButtonLink to="/2027" variant="primary">Join the 2027 List</ButtonLink>}
          />
        </div>
      </Reveal>
    </section>
  </>
);
