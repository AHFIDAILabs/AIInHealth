import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../ui/Reveal';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';

interface PackageGroup {
  label: string;
  isTopTier: boolean;
  items: AdminPartner[];
  tierOrder: number;
}

const Swatch = ({ p, isTopTier, dense = false }: { p: AdminPartner; isTopTier: boolean; dense?: boolean }) => {
  // Logo sized to fill most of its card (object-contain keeping its own
  // aspect ratio) with the card's own padding cut down to match — logos were
  // reading small/timid against all the surrounding white space before.
  // Full color always, not just on hover — grayscale-until-hover read as an
  // unintended "disabled" look on a page whose whole job is showing these
  // logos off.
  //
  // Every tier's logo renders at the same height (h-20 sm:h-24) — tierOrder 1
  // ("Government Partners") used to get a visibly larger h-28/h-32 treatment,
  // but that made its logos look mismatched against every other tier rather
  // than intentionally "bolder". isTopTier still controls the swatch card's
  // own padding/border weight below, just no longer the logo's own size. The
  // grid track width below is also now uniform across tiers for the same
  // reason — with `w-full` on the <img> itself, a wider top-tier track let a
  // landscape/wordmark logo scale up to fill that extra width even though its
  // height cap matched every other tier, so government logos still read as
  // "bigger" despite the height already being equal.
  //
  // `w-full` only resolves sensibly when this swatch sits in a CSS grid cell
  // with a defined track width (the non-dense case). In `dense` mode the
  // swatch is a flex item with no defined width of its own, so `width:100%`
  // has nothing concrete to resolve against and the browser falls back to
  // the image's own intrinsic width — which is how two logos ended up
  // wrapping onto separate lines instead of sitting side by side. An
  // explicit width sidesteps that entirely.
  const logo = p.logoUrl ? (
    <img
      src={p.logoUrl}
      alt={p.logoAlt || p.name}
      title={p.name}
      className={`h-20 object-contain transition-all duration-300 sm:h-24 ${dense ? 'w-28 sm:w-36' : 'w-full'}`}
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
//
// `dense` swaps that grid for a plain flex row: inside the combined
// Host/Title/Technical row, each package only gets one third of the row's
// width, and a 150-190px grid track minimum was wider than that share —
// forcing a package with 2+ logos to wrap one-per-line (a column) instead of
// staying side by side. Flex sizes each swatch to its own content instead of
// a fixed track width, with a smaller gap, so they stay in a single row.
const LogoGrid = ({ group, dense = false }: { group: PackageGroup; dense?: boolean }) => (
  <div
    className={
      dense ? 'flex flex-row flex-wrap justify-center gap-3' : 'grid justify-center gap-6 grid-cols-[repeat(auto-fit,minmax(150px,190px))]'
    }
  >
    {group.items.map((p) => (
      <Swatch key={p._id} p={p} isTopTier={group.isTopTier} dense={dense} />
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
// gets its own full-width row EXCEPT Title Partner and Anchor Partners, named
// in COMBINED_ROW_PACKAGE_NAMES below, which share one row laid out side by
// side (flex-row), each its own column with that package's own heading and
// logos stacked underneath — an explicit, requested exception, not a rule
// derived from tierOrder. Every other package — Host Organisation/Convener,
// Government Partner/Host, Technical Collaborating Partner, Session Partners,
// etc. — keeps its own individual full-width row in its normal tierOrder
// position; only Title Partner/Anchor Partners were asked to share a row.
// tierOrder 1 (currently "Government Partner/Host") still gets a slightly
// bolder swatch card (border/padding, see Swatch above) — but the same logo
// size as every other tier. A partner with no package assigned has nowhere to
// be shown here — the package IS the heading — so it's simply excluded; the
// admin Sponsors tab is where that gets fixed. Whole section stays hidden if
// there's nobody left to show, same self-hiding rule as ConvenedWith.
//
// Matched against the real admin-entered package names, normalized (trimmed,
// internal whitespace collapsed) — verified live against the shared database
// that "Anchor Partners" exists there as two near-duplicate packages, one
// with a double space ("Anchor  Partners"), presumably a typo when it was
// created. Comparing raw strings meant that one silently fell out of this
// combined row and rendered as its own full-width section instead — matching
// on normalized names makes the grouping resilient to that kind of accidental
// whitespace regardless of which of the two the admin ends up keeping.
const COMBINED_ROW_PACKAGE_NAMES = new Set(['Title Partner', 'Anchor Partners']);
const normalizeLabel = (label: string): string => label.trim().replace(/\s+/g, ' ');
export const PartnersShowcase = () => {
  const { t } = useTranslation();
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

  // groups is already tierOrder-sorted. Pull out the named group (if any of
  // them actually have partners) into one combined row, positioned wherever
  // the first of them would otherwise have sorted to; every other package
  // keeps its own individual row.
  const rows: PackageGroup[][] = [];
  const combinedRow: PackageGroup[] = [];
  for (const group of groups) {
    if (COMBINED_ROW_PACKAGE_NAMES.has(normalizeLabel(group.label))) {
      combinedRow.push(group);
    } else {
      rows.push([group]);
    }
  }
  if (combinedRow.length > 0) {
    const firstIndex = groups.findIndex((g) => COMBINED_ROW_PACKAGE_NAMES.has(normalizeLabel(g.label)));
    const insertAt = rows.findIndex((row) => groups.indexOf(row[0]) > firstIndex);
    rows.splice(insertAt === -1 ? rows.length : insertAt, 0, combinedRow);
  }

  return (
    <section className="w-full bg-navy py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white">{t('footer.summit.partners', 'Partners')}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
            {t('home.partners.heading', 'Convened with leading institutions')}
          </h2>
        </Reveal>
      </div>

      {/* Dark band holding every tier's headings + logos — full-bleed (a
          direct child of the section, outside the max-w-5xl heading
          container above) rather than an inset card, so it runs edge to
          edge and gives the logo grids the most room to breathe. White
          swatch cards get real contrast against this instead of blending
          into an all-white section. */}
      <div className="mt-10 w-full bg-navy px-4 py-10 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-6xl space-y-16">
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
                {/* A plain wrapper (no border/background — just layout) around
                    the whole pair, so they share one row. flex-nowrap +
                    overflow-x-auto keeps both columns on one line at any
                    width instead of the previous flex-wrap, which let a
                    narrower viewport drop the second column onto its own
                    line; horizontal scroll is the fallback on very narrow
                    screens instead of silently breaking the "same line"
                    requirement. Content-sized columns, not flex-1 equal
                    thirds — a package with one logo (Title Partner) and one
                    with several (Anchor Partners) don't need the same width. */}
                <div className="overflow-x-auto">
                  <div className="flex flex-row flex-nowrap justify-center gap-x-10">
                    {rowGroups.map((group) => (
                      <div key={group.label} className="flex min-w-[180px] shrink-0 flex-col items-center">
                        <h3 className="text-center font-display text-lg font-bold text-white sm:text-xl">{group.label}</h3>
                        <div className="mt-6">
                          <LogoGrid group={group} dense />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )
          )}
        </div>
      </div>
    </section>
  );
};