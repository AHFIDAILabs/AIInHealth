import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '../ui/Reveal';
import { listPublicPartners, PARTNER_CATEGORIES, type AdminPartner } from '../../services/partner.service';

// Matches the reference layout: a plain, bold centered headline per group,
// then a wide multi-column grid of full-color logos with no card wrappers,
// no swatches, no grayscale-on-hover treatment — just the logos themselves,
// left-aligned within their grid cells. A dark pill CTA sits between groups,
// same as the reference's "Exhibit at Web Summit Vancouver" button.
//
// Grouped by the real PartnerCategory field (Government / Multilateral /
// Private Sector / Academia) — only categories with at least one published
// partner render. Whole section stays hidden if there are zero published
// partners at all, same self-hiding rule as ConvenedWith.
export const PartnersShowcase = () => {
  const [partners, setPartners] = useState<AdminPartner[]>([]);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  if (partners.length === 0) return null;

  const grouped = PARTNER_CATEGORIES.map((category) => ({
    category,
    items: partners.filter((p) => p.category === category),
  })).filter((g) => g.items.length > 0);

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
            <div key={group.category}>
              <Reveal delay={gi * 0.06}>
                <h3 className="text-center font-display text-xl font-bold text-navy sm:text-2xl">
                  {group.category}
                </h3>
              </Reveal>

              <Reveal delay={gi * 0.06 + 0.05}>
                <div className="mt-10 grid grid-cols-2 items-center justify-center gap-x-10 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
                  {group.items.map((p) => {
                    const logo = p.logoUrl ? (
                      <img src={p.logoUrl} alt={p.name} title={p.name} className="h-9 max-w-full object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-navy">{p.name}</span>
                    );
                    return p.website ? (
                      <a
                        key={p._id}
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={p.name}
                        className="flex items-center"
                      >
                        {logo}
                      </a>
                    ) : (
                      <span key={p._id} className="flex items-center">
                        {logo}
                      </span>
                    );
                  })}
                </div>
              </Reveal>

              {gi < grouped.length - 1 && (
                <Reveal delay={gi * 0.06 + 0.1} className="mt-12 flex justify-center">
                  <Link
                    to="/partners"
                    className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-secondary"
                  >
                    Become a Partner
                  </Link>
                </Reveal>
              )}
            </div>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-14 flex justify-center">
          <Link
            to="/partners"
            className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-secondary"
          >
            Become a Partner
          </Link>
        </Reveal>
      </div>
    </section>
  );
};