import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';

// The mid-page "second hero" — a full-width, large-type pull-quote used as a section
// header instead of another generic title, roughly two-thirds down the page where
// scroll fatigue sets in. Attributed honestly to the Concept Note itself (not a
// person or outlet) until a real external endorsement exists to swap in — see the
// brief's explicit caution against attributing a placeholder line to someone who
// didn't say it.
export const PressQuoteBand = () => (
  <section className="relative overflow-hidden bg-navy py-24">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
    />
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/10 blur-[140px]" />

    <Reveal className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
      <span aria-hidden="true" className="font-display text-6xl leading-none text-orange/40">
        &ldquo;
      </span>
      <p className="mx-auto mt-2 max-w-3xl font-display text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
        Nigeria&rsquo;s Premier Platform for <span className="text-orange">AI-Enabled Healthcare</span>
      </p>
      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-slate-400">
        — AI in Health Summit 2026 Concept Note
      </p>

      <p className="mt-8 text-sm font-medium text-slate-300">
        19&ndash;20 October 2026 &middot; International Conference Centre, Abuja, Nigeria
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink to="/register" variant="primary" className="!px-6 !py-3 !text-sm">
          Register Interest
        </ButtonLink>
        <ButtonLink to="/partners" variant="secondary" className="!px-6 !py-3 !text-sm">
          Become a Partner
        </ButtonLink>
      </div>
    </Reveal>
  </section>
);
