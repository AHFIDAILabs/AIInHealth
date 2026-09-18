import { useEffect, useState } from 'react';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';
import ahfidLogo from '../../assets/images/ahfid_logo.png';

const Pill = ({ children }: { children: string }) => (
  <span className="absolute -top-4 whitespace-nowrap rounded-full bg-orange px-4 py-1.5 text-xs font-bold text-navy shadow-md sm:text-sm">
    {children}
  </span>
);

// Floating white card at the hero's bottom edge, echoing the reference's
// "Host Country / Co-Hosts / Curated by" strip — collapsed to the two groups
// that actually apply here: whoever holds the Title sponsorship package
// (dynamic, from the same backend data as PartnersShowcase), and AHFID as
// the summit's curating body (a fixed logo, not partner data).
export const HeroPartnersStrip = () => {
  const [partners, setPartners] = useState<AdminPartner[]>([]);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  const titlePartners = partners.filter((p) => p.package?.tierOrder === 1);

  return (
    <div className="absolute inset-x-0 bottom-10 z-10 hidden px-4 sm:block sm:px-6 lg:px-8">
      <div className="mx-auto flex w-fit max-w-full flex-wrap items-start justify-center gap-x-16 gap-y-8 rounded-b-[2.5rem] bg-white px-10 pb-8 pt-7 shadow-2xl sm:px-16">
        {titlePartners.length > 0 && (
          <div className="relative flex flex-col items-center">
            <Pill>Title Partner</Pill>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {titlePartners.map((p) => (
                <img
                  key={p._id}
                  src={p.logoUrl}
                  alt={p.name}
                  title={p.name}
                  className="h-10 w-auto object-contain sm:h-12"
                />
              ))}
            </div>
          </div>
        )}

        <div className="relative flex flex-col items-center">
          <Pill>Curated by</Pill>
          <a href="https://ahfid.org/" target="_blank" rel="noopener noreferrer">
            <img
              src={ahfidLogo}
              alt="Africa Hub for Innovation and Development"
              title="Africa Hub for Innovation and Development"
              className="h-10 w-auto object-contain sm:h-12"
            />
          </a>
        </div>
      </div>
    </div>
  );
};
