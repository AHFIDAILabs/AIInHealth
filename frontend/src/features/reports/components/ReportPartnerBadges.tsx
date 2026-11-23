import { useEffect, useState } from 'react';
import { listPublicPartners, type AdminPartner } from '../../../services/partner.service';
import { REPORT_PARTNER_INFO } from '../../../content/2026/report-partners';

let partnersPromise: Promise<AdminPartner[]> | null = null;
// One shared fetch for the whole library/session page tree — every session
// card renders its own <ReportPartnerBadges>, but they all want the same
// published partner list, so this memoizes the single in-flight request
// rather than firing one per card.
const loadPartners = (): Promise<AdminPartner[]> => {
  partnersPromise ??= listPublicPartners().catch(() => []);
  return partnersPromise;
};

interface ReportPartnerBadgesProps {
  partners: string[];
  className?: string;
}

// Renders each session partner as its real logo when the public Partner
// directory has a published, matching record — falls back to a plain text
// pill (full name if known, else the bare abbreviation) rather than guessing
// or fetching a logo from anywhere else. See content/2026/report-partners.ts's
// own comment on why most abbreviations have no entry yet.
export const ReportPartnerBadges = ({ partners, className = '' }: ReportPartnerBadgesProps) => {
  const [directory, setDirectory] = useState<AdminPartner[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPartners().then((list) => {
      if (!cancelled) setDirectory(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (partners.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {partners.map((abbr) => {
        const info = REPORT_PARTNER_INFO[abbr];
        const fullName = info?.fullName ?? abbr;
        const matchName = (info?.matchName ?? info?.fullName ?? abbr).toLowerCase();
        const match = directory?.find((p) => p.isPublished && p.logoUrl && p.name.toLowerCase() === matchName);

        if (match?.logoUrl) {
          return (
            <img
              key={abbr}
              src={match.logoUrl}
              alt={match.logoAlt || fullName}
              title={fullName}
              className="h-6 w-auto max-w-[96px] object-contain"
            />
          );
        }
        return (
          <span
            key={abbr}
            title={fullName}
            className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500"
          >
            {abbr}
          </span>
        );
      })}
    </div>
  );
};
