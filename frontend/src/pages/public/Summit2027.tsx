import { PageHero } from '../../design-system/patterns';
import { NewsletterCapture } from '../../components/home/NewsletterCapture';
import { SEO } from '../../components/seo/SEO';
import heroBg from '../../assets/images/hero_bg.webp';

// Interim "stay in touch" placeholder for the 2027 edition — deliberately
// light. The real 2027 interest list (multi-select interests, WhatsApp
// opt-in, consent capture) is its own later checkpoint with a dedicated
// backend domain; this reuses the existing newsletter capture so every
// retired 2026 page and RSVP link has somewhere real to send people in the
// meantime, rather than a dead end. Per section 13, dates/theme are
// deliberately unconfirmed until management decides.
export const Summit2027 = () => (
  <>
    <SEO title="AI in Health Summit 2027" description="Dates to be announced — join the list to hear first about the next AI in Health Summit." path="/2027" />
    <PageHero eyebrow="Save the Date" title="AI in Health Summit 2027" subtitle="Dates to be announced." />

    <NewsletterCapture
      photo={heroBg}
      eyebrow="Stay in the Loop"
      title="Be the First to Know"
      body="We're already planning the next edition. Leave your details and we'll email you as soon as dates, themes and registration open."
      cta="Join the List"
      source="summit_2027_interest"
      successMessage="You're on the list — we'll be in touch."
    />
  </>
);
