import { motion } from 'framer-motion';
import { ButtonLink } from '../../../components/ui/Button';
import heroBg from '../../../assets/images/hero_bg.webp';

// The new home's own hero — deliberately NOT PageHero (see the Design Plan
// checkpoint's self-review): PageHero's all-caps eyebrow + fade-slide-up on
// every element is exactly what section 7.2 rules out for this page. One
// motion moment here (a single fade-in on load), photography doing the
// actual work, plain sentence-case copy.
export const PostEventHero = () => (
  <section className="relative isolate overflow-hidden bg-navy-nav">
    <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/30" />

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-end px-4 pb-16 pt-32 sm:px-6 sm:pb-20 lg:px-8"
    >
      <h1 className="font-display text-3xl font-semibold text-white sm:text-5xl">AI in Health Summit 2026</h1>
      <p className="mt-3 text-base text-slate-200 sm:text-lg">19–20 October 2026, Abuja. Here's what happened.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/compendium" variant="primary">Browse the compendium</ButtonLink>
        <ButtonLink to="/2027" variant="secondary">Join the 2027 list</ButtonLink>
      </div>
    </motion.div>
  </section>
);
