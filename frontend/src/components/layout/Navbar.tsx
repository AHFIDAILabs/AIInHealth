import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, ArrowRight, LogIn, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/AI_Logo_New_white.png';
import { useLanguage, SITE_LANGUAGES, LANGUAGE_LABEL } from '../../contexts/LanguageContext';

interface NavItem {
  id: string;
  label: string;
  to: string;
  external?: boolean;
}

const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex items-center gap-0.5 rounded-full border border-white/15 p-0.5 ${className}`}>
      <Globe size={11} className="ml-1.5 mr-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      {SITE_LANGUAGES.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
            lang === l ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {LANGUAGE_LABEL[l]}
        </button>
      ))}
    </div>
  );
};

// Ids tucked into the desktop "More" dropdown instead of the flat main row —
// kept out of NAV_ITEMS' own shape (no per-item "inMoreMenu" flag) since this
// is purely a desktop-row grouping decision; the mobile menu still lists
// every item flat, where clutter isn't a concern the same way.
const MORE_MENU_IDS = ['sponsored-delegates', 'wai-health'];

export const Navbar = () => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const location = useLocation();

  // Flat, minimal nav — matches the real production site (aiinhealthsummit.org)
  // exactly: Home, Register Now, Innovation Showcase, and an external link out
  // to AHFID's own site. Deliberately not the old mega-menu of every page this
  // app has (Agenda/Speakers/Partners/Gallery/etc.) — those are all still one
  // click away via the Footer, this is just what the header itself shows now.
  // Built inside the component (not a module constant) so `label` can go
  // through t() — `id` is the stable, untranslated identifier the filters/
  // keys below actually compare against.
  const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: t('nav.home', 'Home'), to: '/' },
    { id: 'agenda', label: t('nav.agenda', 'Agenda'), to: '/agenda' },
    { id: 'speakers', label: t('nav.speakers', 'Speakers'), to: '/speakers' },
    { id: 'abstracts', label: t('nav.abstracts', 'Abstracts'), to: '/abstracts/confirmed' },
    { id: 'innovations', label: t('nav.innovations', 'Innovations'), to: '/innovation-showcase/confirmed' },
    { id: 'gallery', label: t('nav.gallery', 'Gallery'), to: '/gallery' },
    // Tucked into the "More" dropdown below rather than the main row — two
    // more flat items here made the header read as cluttered.
    { id: 'sponsored-delegates', label: t('nav.sponsoredDelegates', 'Sponsored Delegates'), to: '/sponsored-delegates' },
    { id: 'wai-health', label: t('nav.waiHealth', 'Women in AI'), to: '/wai-health-breakfast' },
    { id: 'register', label: t('nav.registerNow', 'Register Now'), to: '/register' },
    { id: 'ahfid', label: 'AHFID', to: 'https://ahfid.org/', external: true },
    // Delegate portal sign-in — kept out of the main nav row (see the filter
    // below) and shown instead in the utility strip next to AHFID, and in the
    // mobile menu list. Anyone with a confirmed registration lands here; if
    // they've lost their access code, PortalLogin.tsx's "Resend it" re-sends
    // both the code and their QR ticket to their email.
    { id: 'login', label: t('nav.login', 'Login'), to: '/portal/login' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // <main>'s padding-top and the hero's cancelling negative margin both read
    // this instead of guessing the header's height at each Tailwind
    // breakpoint — the header's real height (single row vs. two-tier, and the
    // logo's own responsive size) never lines up cleanly with lg's 1024px cut,
    // so a measured value is the only way both stay exactly in sync.
    const update = () => {
      const height = el.offsetHeight;
      setHeaderHeight(height);
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrolled]);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreOpen]);

  return (
    <>
      <motion.header
        ref={headerRef}
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 print:hidden ${
          scrolled ? 'bg-navy-nav/95 shadow-xl backdrop-blur-md' : 'bg-navy-nav/75 backdrop-blur-sm'
        }`}
      >
        {/* Utility row — thin strip above the main nav, same two-tier structure as
            the reference (their MEDIA/FIELD TRIPS/etc + socials row). We don't have
            five separate utility links, so this carries the date/venue instead of
            sitting empty. */}
        <div className="hidden border-b border-white/10 lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-5 px-4 py-1.5 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {t('nav.dateVenue', '19–20 Oct 2026 · Abuja, Nigeria')}
            </p>
            <span className="h-3 w-px bg-white/15" />
            <a
              href="https://ahfid.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-orange"
            >
              AHFID <ArrowUpRight size={11} />
            </a>
            <span className="h-3 w-px bg-white/15" />
            <Link
              to="/portal/login"
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-orange"
            >
              <LogIn size={11} /> {t('nav.login', 'Login')}
            </Link>
            <span className="h-3 w-px bg-white/15" />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Main row */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          {/* Exact logo file (icon + wordmark, full lockup), recolored to white so
              it can float directly on this dark header with no background plate —
              same image, same layout, same words, just white instead of black. */}
          <Link to="/" className="flex shrink-0 items-center">
            <img
              src={logo}
              alt={t('nav.logoAlt', 'The Artificial Intelligence in Health Summit 2026')}
              className="h-8 w-auto sm:h-9"
            />
          </Link>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {NAV_ITEMS.filter((i) => i.id !== 'ahfid' && i.id !== 'login' && !MORE_MENU_IDS.includes(i.id)).map((item) => (
              <Fragment key={item.id}>
                {item.id === 'register' ? (
                  <Link
                    to={item.to}
                    className="ml-3 flex items-center gap-2 rounded-full bg-orange px-5 py-1.5 text-sm font-bold text-white shadow-lg shadow-orange/30 transition-all hover:scale-[1.03] hover:bg-orange-hover"
                  >
                    {item.label} <ArrowRight size={16} />
                  </Link>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `rounded-lg px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-colors ${
                        isActive ? 'text-orange' : 'text-white hover:text-orange'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                )}
                {/* "More" (Sponsored Delegates / Women in AI) sits right after
                    Gallery, rather than at the end of the row, per direct request. */}
                {item.id === 'gallery' && (
                  <div className="relative" ref={moreRef}>
                    <button
                      onClick={() => setMoreOpen((v) => !v)}
                      aria-expanded={moreOpen}
                      className={`flex items-center gap-1 rounded-lg px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-colors ${
                        moreOpen || MORE_MENU_IDS.some((id) => location.pathname === NAV_ITEMS.find((i) => i.id === id)?.to)
                          ? 'text-orange'
                          : 'text-white hover:text-orange'
                      }`}
                    >
                      {t('nav.more', 'More')} <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {moreOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-2 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-navy-nav shadow-xl"
                        >
                          {NAV_ITEMS.filter((i) => MORE_MENU_IDS.includes(i.id)).map((moreItem) => (
                            <NavLink
                              key={moreItem.id}
                              to={moreItem.to}
                              onClick={() => setMoreOpen(false)}
                              className={({ isActive }) =>
                                `block px-4 py-3 text-[13px] font-semibold ${isActive ? 'text-orange' : 'text-white hover:bg-white/5 hover:text-orange'}`
                              }
                            >
                              {moreItem.label}
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </Fragment>
            ))}
          </nav>

          <button
            className="-mr-2 p-2 text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      {createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              style={{ top: headerHeight }}
              className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1 overflow-y-auto bg-navy-nav px-6 py-6 lg:hidden"
            >
              <LanguageSwitcher className="mb-3 self-start" />
              {NAV_ITEMS.filter((i) => i.id !== 'register').map((item) =>
                item.external ? (
                  <a
                    key={item.id}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between border-b border-slate-800/60 py-4 text-base font-medium text-white"
                  >
                    {item.label} <ArrowUpRight size={16} className="text-slate-400" />
                  </a>
                ) : (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `border-b border-slate-800/60 py-4 text-base font-medium ${isActive ? 'text-orange' : 'text-white'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
              )}
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="mt-6 rounded-full bg-orange px-5 py-3.5 text-center text-sm font-semibold text-white"
              >
                {t('nav.registerNow', 'Register Now')}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
