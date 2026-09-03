import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AbujaSkyline } from './AbujaSkyline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import heroBg from '../../assets/images/hero_bg.png';

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  // Only needed when `title` isn't a plain string (e.g. it contains JSX for
  // formatting) — the browser tab/share title needs plain text either way.
  documentTitle?: string;
}

// Shared sub-page header — carries the same photo + navy/brown wash as Home's dark
// hero panel, scaled down and centered for interior pages, so every page opens on
// that same photographic beat instead of a flat color block. Also sets the page's
// <title> (used by all 13 interior pages), which previously all shared the same
// static title from index.html regardless of which page was open or shared.
export const PageHero = ({ eyebrow, title, subtitle, children, documentTitle }: PageHeroProps) => {
  useDocumentTitle(documentTitle ?? (typeof title === 'string' ? title : eyebrow));

  return (
  <section className="relative isolate overflow-hidden bg-navy-nav pb-20 pt-28 sm:pb-24 sm:pt-32">
    <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-br from-navy/95 via-navy/88 to-[#3a2415]/85" />
    <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
    <div className="pointer-events-none absolute right-10 top-16 h-48 w-48 rounded-full bg-orange/20 blur-[90px]" />
    <div
      className="pointer-events-none absolute inset-y-0 right-[15%] hidden w-px bg-gradient-to-b from-transparent via-orange/40 to-transparent lg:block"
      style={{ transform: 'skewX(-8deg)' }}
    />

    <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-2.5"
      >
        <span className="h-px w-6 bg-orange/60" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange">{eyebrow}</p>
        <span className="h-px w-6 bg-orange/60" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05 }}
        className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-300"
        >
          {subtitle}
        </motion.p>
      )}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-8"
        >
          {children}
        </motion.div>
      )}
    </div>

    <AbujaSkyline className="pointer-events-none absolute bottom-0 left-0 h-16 w-full" opacity={0.2} />
  </section>
  );
};
