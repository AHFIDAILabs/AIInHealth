import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';

interface PackageGroup {
  label: string;
  isTopTier: boolean;
  items: AdminPartner[];
  tierOrder: number;
}

const Swatch = ({ p, isTopTier }: { p: AdminPartner; isTopTier: boolean }) => {
  // Logo sized to fill most of its card (tall + full-width, object-contain
  // keeping its own aspect ratio) with the card's own padding cut down to
  // match — logos were reading small/timid against all the surrounding
  // white space before.
  const logo = p.logoUrl ? (
    <img
      src={p.logoUrl}
      alt={p.name}
      title={p.name}
      className={`w-full object-contain grayscale transition-all duration-300 group-hover:grayscale-0 ${
        isTopTier ? 'h-28 sm:h-32' : 'h-20 sm:h-24'
      }`}
    />
  ) : (
    <span className={`font-bold text-navy ${isTopTier ? 'text-2xl' : 'text-lg'}`}>{p.name}</span>
  );
  const swatchClass = `group flex items-center justify-center rounded-2xl border bg-white transition-all duration-300 hover:border-orange/40 hover:shadow-md ${
    isTopTier ? 'border-slate-200 p-4' : 'border-slate-100 p-3'
  }`;
  return p.website ? (
    <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={p.name} className={swatchClass}>
      {logo}
    </a>
  ) : (
    <span className={swatchClass}>{logo}</span>
  );
};

// An auto-fit grid (rather than a fixed grid-cols-N) centers itself as a
// group even when a tier has fewer partners than a full row — a fixed
// column count would otherwise leave a lone or partial row stuck at the
// left edge instead of centered under the heading.
const LogoGrid = ({ group }: { group: PackageGroup }) => (
  <div
    className={`grid justify-center gap-6 ${
      group.isTopTier ? 'grid-cols-[repeat(auto-fit,minmax(190px,230px))]' : 'grid-cols-[repeat(auto-fit,minmax(150px,190px))]'
    }`}
  >
    {group.items.map((p) => (
      <Swatch key={p._id} p={p} isTopTier={group.isTopTier} />
    ))}
  </div>
);

// A bold centered headline per tier, then a multi-column grid of logo
// "swatches" — bordered white cards, each logo centered within its own card
// (not left-aligned), grayscale by default and switching to full color on
// hover (same treatment as the marquee in ConvenedWith and the "Current
// Partners" strip on the public Partners page). No "Become a Partner" CTA
// here — that ask lives in the hero and closing CTA sections instead.
//
// Grouped by each partner's assigned sponsorship package (managed in the
// admin Packages tab), highest tier first (lowest tierOrder). Every package
// gets its own full-width row EXCEPT the three named in
// COMBINED_ROW_PACKAGE_NAMES below, which share one row laid out side by
// side (flex-row), each its own column with that package's own heading and
// logos stacked underneath — an explicit, requested exception, not a rule
// derived from tierOrder (two packages can share a tierOrder — e.g. Anchor
// Partners/Session Partners both sit at 4 today — without being meant to
// share a row; only this specific trio does). tierOrder 1 (currently
// "Government Partners") gets a visibly larger, bolder swatch/logo — the one
// place tier literally translates to size on the page. A partner with no
// package assigned has nowhere to be shown here — the package IS the
// heading — so it's simply excluded; the admin Sponsors tab is where that
// gets fixed. Whole section stays hidden if there's nobody left to show,
// same self-hiding rule as ConvenedWith.
const COMBINED_ROW_PACKAGE_NAMES = new Set(['Host', 'Title Partners', 'Technical Collaborating Partner']);
export const PartnersShowcase = () => {
  const [partners, setPartners] = useState<AdminPartner[]>([]);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  const withPackage = partners.filter(
    (p): p is AdminPartner & { package: { _id: string; name: string; price: number; tierOrder?: number } } => !!p.package
  );

  if (withPackage.length === 0) return null;

  const packagesById = new Map(withPackage.map((p) => [p.package._id, p.package]));
  const groups: PackageGroup[] = Array.from(packagesById.values())
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
    .map((pkg) => ({
      label: pkg.name,
      isTopTier: pkg.tierOrder === 1,
      items: withPackage.filter((p) => p.package._id === pkg._id),
      tierOrder: pkg.tierOrder ?? 0,
    }));

  // groups is already tierOrder-sorted. Pull out the named trio (if any of
  // them actually have partners) into one combined row, positioned wherever
  // the first of them would otherwise have sorted to; every other package —
  // Anchor Partners and Session Partners included, even though they happen
  // to share a tierOrder — keeps its own individual row.
  const rows: PackageGroup[][] = [];
  const combinedRow: PackageGroup[] = [];
  for (const group of groups) {
    if (COMBINED_ROW_PACKAGE_NAMES.has(group.label)) {
      combinedRow.push(group);
    } else {
      rows.push([group]);
    }
  }
  if (combinedRow.length > 0) {
    const firstIndex = groups.findIndex((g) => COMBINED_ROW_PACKAGE_NAMES.has(g.label));
    const insertAt = rows.findIndex((row) => groups.indexOf(row[0]) > firstIndex);
    rows.splice(insertAt === -1 ? rows.length : insertAt, 0, combinedRow);
  }

  return (
    <section className="w-full justify-center bg-white py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Partners</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Convened with leading institutions
          </h2>
        </Reveal>

        {/* Dark card holding every tier's headings + logos — narrower than
            the section itself (not full-bleed) so it reads as an inset
            panel on the white section behind it, not a same-size background
            swap. White swatch cards get real contrast against this instead
            of blending into an all-white section. */}
        <div className="mx-auto mt-14 max-w-4xl rounded-3xl bg-navy px-6 py-12 sm:px-10 sm:py-16">
          <div className="space-y-16">
            {rows.map((rowGroups, ri) =>
              rowGroups.length === 1 ? (
                <div key={rowGroups[0].label}>
                  <Reveal delay={ri * 0.06}>
                    <h3 className="text-center font-display text-xl font-bold text-white sm:text-2xl">
                      {rowGroups[0].label}
                    </h3>
                  </Reveal>
                  <Reveal delay={ri * 0.06 + 0.05} className="mt-10">
                    <LogoGrid group={rowGroups[0]} />
                  </Reveal>
                </div>
              ) : (
                <Reveal key={rowGroups.map((g) => g.label).join('|')} delay={ri * 0.06}>
                  <div className="flex flex-row flex-wrap justify-center gap-x-12 gap-y-12">
                    {rowGroups.map((group) => (
                      <div key={group.label} className="flex min-w-[220px] flex-1 flex-col items-center">
                        <h3 className="text-center font-display text-lg font-bold text-white sm:text-xl">{group.label}</h3>
                        <div className="mt-6">
                          <LogoGrid group={group} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};