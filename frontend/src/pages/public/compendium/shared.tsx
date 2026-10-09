import { NavLink } from 'react-router-dom';

// Small cross-page nav shared by all five compendium pages — kept out of
// Navbar.tsx entirely (that's the site-wide nav; this is a local section
// nav, same idea as a book's own running header). Hidden on print since a
// printed abstract page should be just the abstract.
const LINKS = [
  { to: '/compendium', label: 'Home' },
  { to: '/compendium/authors', label: 'Authors' },
  { to: '/compendium/keywords', label: 'Keywords' },
  { to: '/compendium/about', label: 'About' },
];

export const CompendiumSubnav = () => (
  <nav aria-label="Compendium sections" className="print:hidden border-b border-slate-200 bg-offwhite">
    <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-sm sm:px-6">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={({ isActive }) =>
            `font-medium ${isActive ? 'text-navy underline underline-offset-4' : 'text-slate-600 hover:text-navy hover:underline'}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export const CompendiumLoading = ({ label }: { label: string }) => (
  <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
    <p className="text-sm text-slate-500" role="status">
      {label}
    </p>
  </div>
);

export const CompendiumError = ({ message }: { message: string }) => (
  <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
    <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">
      {message}
    </p>
  </div>
);

// Used for both author and keyword index anchors — not cryptographic, just
// readable fragment ids, so a plain ASCII-fold is enough.
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const LICENCE_CAVEAT = ' (not yet confirmed with AHFID)';
