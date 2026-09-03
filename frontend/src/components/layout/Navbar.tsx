import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import summitMark from '../../assets/images/summit_logo_mark.png';

interface SegmentLink {
  label: string;
  to: string;
  description: string;
  external?: boolean;
}
interface NavSegment {
  label: string;
  links: SegmentLink[];
}

// Grouped by *who's visiting*, not a flat link list — mirrors the audience segments
// already named in the Concept Note's Target Participants list, mapped onto the
// pages that already exist rather than inventing new ones.
const NAV_SEGMENTS: NavSegment[] = [
  {
    label: 'Delegates',
    links: [
      { label: 'Agenda', to: '/agenda', description: 'The full two-day programme and session tracks.' },
      { label: 'Speakers', to: '/speakers', description: 'Confirmed ministers, regulators, and global health leaders.' },
      { label: 'What to Expect', to: '/participants-outcomes', description: 'Who attends, and what the Summit delivers.' },
      { label: 'Submit an Abstract', to: '/abstracts/submit', description: 'Present peer-reviewed research on AI-in-health innovation.' },
    ],
  },
  {
    label: 'Partners & Investors',
    links: [
      { label: 'Partnership Tiers', to: '/partners', description: 'Visibility, influence, and access packages.' },
      { label: 'Startup Showcase', to: '/innovation-showcase', description: 'Live demonstrations and deal-room matchmaking.' },
      { label: 'Become a Partner', to: '/register', description: "Register your organization's interest." },
    ],
  },
  {
    label: 'Government & Policy',
    links: [
      { label: 'About the Summit', to: '/about', description: 'Background, positioning, and strategic mandate.' },
      { label: 'Objectives & Outcomes', to: '/participants-outcomes', description: 'The five foundational pillars and expected outcomes.' },
      { label: 'About AHFID', to: 'https://ahfid.org/', description: 'The organization convening AHTS 2026.', external: true },
    ],
  },
  {
    label: 'Media',
    links: [
      { label: 'Press & Media Inquiries', to: '/contact', description: 'Reach the Summit Secretariat directly.' },
      { label: 'About AHFID', to: 'https://ahfid.org/', description: 'Background on the convening organization.', external: true },
    ],
  },
];

const SegmentLinkItem = ({ link, onNavigate }: { link: SegmentLink; onNavigate: () => void }) =>
  link.external ? (
    <a
      href={link.to}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      className="group flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
    >
      <div>
        <p className="text-[13.5px] font-semibold text-white">{link.label}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-400">{link.description}</p>
      </div>
      <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-slate-500 transition-colors group-hover:text-orange" />
    </a>
  ) : (
    <Link
      to={link.to}
      onClick={onNavigate}
      className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
    >
      <p className="text-[13.5px] font-semibold text-white">{link.label}</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-400">{link.description}</p>
    </Link>
  );

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSegment, setOpenSegment] = useState<string | null>(null);
  const [mobileSegment, setMobileSegment] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close everything on route change and on outside click — a click-toggle mega-menu
  // (not hover-only) so it works the same on touch and keyboard as with a mouse.
  useEffect(() => {
    setMobileOpen(false);
    setOpenSegment(null);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenSegment(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <>
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-slate-800/90 bg-navy-nav/95 py-3 shadow-xl backdrop-blur-md'
          : 'border-slate-800/50 bg-navy-nav/80 py-4 backdrop-blur-sm'
      }`}
    >
      <div ref={navRef} className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={summitMark} alt="" aria-hidden="true" className="h-8 w-8 rounded-md" />
          <span className="font-display text-[16px] font-semibold tracking-tight text-white">
            AI<span className="text-orange">in</span>Health
            <span className="ml-1.5 hidden font-normal text-slate-500 sm:inline">Summit 2026</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_SEGMENTS.map((segment) => {
            const isOpen = openSegment === segment.label;
            return (
              <div key={segment.label} className="relative">
                <button
                  onClick={() => setOpenSegment(isOpen ? null : segment.label)}
                  className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                    isOpen ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {segment.label}
                  <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-800 bg-navy-nav p-2 shadow-2xl"
                    >
                      {segment.links.map((link) => (
                        <SegmentLinkItem key={link.label} link={link} onNavigate={() => setOpenSegment(null)} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="hidden rounded-full bg-orange px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-lg shadow-orange/25 transition-all hover:scale-[1.03] hover:bg-orange-hover sm:inline-flex"
          >
            Register Interest
          </Link>
          <button
            className="text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </motion.header>

    {/* Portaled to <body> — a `fixed` panel positions itself relative to the nearest
        transformed ancestor, and motion.header above carries a transform from its own
        entrance animation, which would otherwise trap this panel inside the header's
        own (much shorter) box instead of covering the viewport. */}
    {createPortal(
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[60px] z-40 flex flex-col gap-1 overflow-y-auto bg-navy-nav px-6 py-6 lg:hidden"
          >
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className="border-b border-slate-800/60 py-4 text-base font-medium text-white"
            >
              Home
            </NavLink>
            {NAV_SEGMENTS.map((segment) => {
              const isOpen = mobileSegment === segment.label;
              return (
                <div key={segment.label} className="border-b border-slate-800/60">
                  <button
                    onClick={() => setMobileSegment(isOpen ? null : segment.label)}
                    className="flex w-full items-center justify-between py-4 text-base font-medium text-white"
                  >
                    {segment.label}
                    <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pb-3"
                      >
                        {segment.links.map((link) =>
                          link.external ? (
                            <a
                              key={link.label}
                              href={link.to}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMobileOpen(false)}
                              className="block py-2.5 pl-2 text-sm text-slate-300"
                            >
                              {link.label}
                            </a>
                          ) : (
                            <Link
                              key={link.label}
                              to={link.to}
                              onClick={() => setMobileOpen(false)}
                              className="block py-2.5 pl-2 text-sm text-slate-300"
                            >
                              {link.label}
                            </Link>
                          )
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="mt-6 rounded-full bg-orange px-5 py-3.5 text-center text-sm font-semibold text-white"
            >
              Register Interest
            </Link>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
};
