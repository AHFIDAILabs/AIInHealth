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

// Groups an already-sorted [key, value][] list into letter buckets (A, B, C…)
// for a proper index layout — shared by the Author/Institution/Keyword index
// pages. Non-letter leading characters (numbers, punctuation) fall under '#'.
export const groupByFirstLetter = <T,>(entries: [string, T][]): [string, [string, T][]][] => {
  const buckets = new Map<string, [string, T][]>();
  for (const entry of entries) {
    const firstChar = entry[0].trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
    const bucket = buckets.get(letter) ?? [];
    bucket.push(entry);
    buckets.set(letter, bucket);
  }
  return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
};

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
