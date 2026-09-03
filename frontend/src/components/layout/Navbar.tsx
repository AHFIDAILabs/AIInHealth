import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import summitMark from '../../assets/images/summit_logo_mark.png';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Agenda', to: '/agenda' },
  { label: 'Speakers', to: '/speakers' },
  { label: 'Showcase', to: '/innovation-showcase' },
  { label: 'Outcomes', to: '/participants-outcomes' },
  { label: 'Partners', to: '/partners' },
  { label: 'About AHFID', to: 'https://ahfid.org/' },
  { label: 'Contact', to: '/contact' },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={summitMark} alt="" aria-hidden="true" className="h-8 w-8 rounded-md" />
          <span className="font-display text-[16px] font-semibold tracking-tight text-white">
            AI<span className="text-orange">in</span>Health
            <span className="ml-1.5 hidden font-normal text-slate-500 sm:inline">Summit 2026</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative py-1 text-[13.5px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-px bg-orange transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[60px] z-40 flex flex-col gap-1 bg-navy-nav px-6 py-8 lg:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="border-b border-slate-800/60 py-4 text-base font-medium text-white"
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="mt-6 rounded-full bg-orange px-5 py-3.5 text-center text-sm font-semibold text-white"
            >
              Register Interest
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
