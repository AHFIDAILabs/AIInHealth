import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';

// A bold centered headline per tier, then a multi-column grid of logo
// "swatches" — bordered white cards, each logo centered within its own card
// (not left-aligned), grayscale by default and switching to full color on
// hover (same treatment as the marquee in ConvenedWith and the "Current
// Partners" strip on the public Partners page). No "Become a Partner" CTA
// here — that ask lives in the hero and closing CTA sections instead.
//
// Grouped by each partner's assigned sponsorship package (Title/Technical/
// Supporting Partners — managed in the admin Packages tab), highest tier
// first (lowest tierOrder). Title Partners (tierOrder 1) get a visibly
// larger, bolder swatch/logo than the tiers below — the one place tier
// literally translates to size on the page. A partner with no package
// assigned has nowhere to be shown here — the package IS the heading — so
// it's simply excluded; the admin Sponsors tab is where that gets fixed.
// Whole section stays hidden if there's nobody left to show, same
// self-hiding rule as ConvenedWith.
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
  const grouped = Array.from(packagesById.values())
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
    .map((pkg) => ({
      label: pkg.name,
      isTopTier: pkg.tierOrder === 1,
      items: withPackage.filter((p) => p.package._id === pkg._id),
    }));

  return (
    <section className="w-full justify-center bg-white py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Partners</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Convened with leading institutions
          </h2>
        </Reveal>

        <div className="mt-14 space-y-16">
          {grouped.map((group, gi) => (
            <div key={group.label}>
              <Reveal delay={gi * 0.06}>
                <h3 className="text-center font-display text-xl font-bold text-navy sm:text-2xl">
                  {group.label}
                </h3>
              </Reveal>

              <Reveal delay={gi * 0.06 + 0.05}>
                <div
                  className={`mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 ${
                    group.isTopTier ? 'lg:grid-cols-4' : 'lg:grid-cols-4'
                  }`}
                >
                  {group.items.map((p) => {
                    const logo = p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt={p.name}
                        title={p.name}
                        className={`max-w-full object-contain grayscale transition-all duration-300 group-hover:grayscale-0 ${
                          group.isTopTier ? 'h-20 sm:h-24' : 'h-14 sm:h-16'
                        }`}
                      />
                    ) : (
                      <span className={`font-bold text-navy ${group.isTopTier ? 'text-2xl' : 'text-lg'}`}>{p.name}</span>
                    );
                    const swatchClass = `group flex items-center justify-center rounded-2xl border bg-white transition-all duration-300 hover:border-orange/40 hover:shadow-md ${
                      group.isTopTier ? 'border-slate-200 p-8' : 'border-slate-100 p-6'
                    }`;
                    return p.website ? (
                      <a key={p._id} href={p.website} target="_blank" rel="noopener noreferrer" aria-label={p.name} className={swatchClass}>
                        {logo}
                      </a>
                    ) : (
                      <span key={p._id} className={swatchClass}>
                        {logo}
                      </span>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};