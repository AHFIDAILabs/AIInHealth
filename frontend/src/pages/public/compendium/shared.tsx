import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { InitialsAvatar } from '../../../design-system/primitives/InitialsAvatar';

// Small cross-page nav shared by all six compendium pages — kept out of
// Navbar.tsx entirely (that's the site-wide nav; this is a local section
// nav, same idea as a book's own running header). Hidden on print since a
// printed abstract page should be just the abstract.
const LINKS = [
  { to: '/compendium', label: 'Home' },
  { to: '/compendium/authors', label: 'Authors' },
  { to: '/compendium/institutions', label: 'Institutions' },
  { to: '/compendium/keywords', label: 'Keywords' },
  { to: '/compendium/about', label: 'About' },
];

// Shared by CompendiumHome.tsx and CompendiumAbout.tsx — the one place this
// literal string lives, so the two pages can never drift apart on it.
export const FALLBACK_EDITION_TITLE = 'AI in Health Summit 2026 — Compendium of Abstracts';

// "Lawal, Abiola Abdulrafiu" — the surname-first form used by the reference
// compendium's own Annex indexes. Takes the last whitespace-separated token
// as the surname; not a universal name-parsing solution, but matches the
// "Given Names + single Surname" shape our author data actually has.
export const formatSurnameFirst = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.trim();
  const surname = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ');
  return `${surname}, ${given}`;
};

export const CompendiumSubnav = () => (
  <nav aria-label="Compendium sections" className="print:hidden border-b border-compendium-ink/10 bg-compendium-cream">
    <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-sm sm:px-6">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={({ isActive }) =>
            `font-semibold ${isActive ? 'text-orange underline underline-offset-4' : 'text-compendium-ink/70 hover:text-orange hover:underline'}`
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

// Shared by both the list and detail pages — falls back to the branded
// initials tile if photoUrl is missing OR if the image actually fails to
// load at runtime (a dead link, a deleted asset, a slow/flaky connection),
// rather than letting a visitor see a broken-image icon.
export const PresenterPhoto = ({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name: string;
  className: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (!photoUrl || failed) return <InitialsAvatar name={name} className={className} />;
  return <img src={photoUrl} alt="" onError={() => setFailed(true)} className={`${className} object-cover`} />;
};
