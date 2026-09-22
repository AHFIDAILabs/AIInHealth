import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import ahfidMark from '../../assets/images/Icon@4x.png';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';

// Real partner logos, auto-scrolling marquee (pauses on hover). Backed by the real
// GET /partners (published-only) — a partner added and published in the admin
// shows up here without a code change, same as ConfirmedVoices for speakers.
export const ConvenedWith = () => {
  const [partners, setPartners] = useState<AdminPartner[]>([]);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  // Nothing to show a marquee of yet — the AHFID "Convener" chip alone would look
  // like a bug, not a feature, so the whole section stays hidden until there's at
  // least one real published partner.
  if (partners.length === 0) return null;

  return (
    <section className="overflow-hidden border-b border-slate-100 bg-white py-12">
      <Reveal className="mx-auto mb-6 flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange">Convened With</p>
        <ButtonLink to="/partners" variant="secondary" className="!mt-2 !border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5 !px-4 !py-2 !text-xs">
          Become a Partner
        </ButtonLink>
      </Reveal>
      <div className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
        {[0, 1].map((rep) => (
          <div key={rep} className="flex items-center gap-10">
            <div className="flex shrink-0 items-center gap-2.5 rounded-lg bg-ahfid/5 px-3 py-2">
              <img src={ahfidMark} alt="AHFID" className="h-7 w-7 rounded" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ahfid">Convener</span>
            </div>
            {partners.map((partner) => {
              const img = partner.logoUrl ? (
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  title={partner.name}
                  className="h-9 shrink-0 object-contain"
                />
              ) : (
                <span className="shrink-0 text-sm font-semibold text-slate-400" title={partner.name}>
                  {partner.name}
                </span>
              );
              return partner.website ? (
                <a key={partner._id} href={partner.website} target="_blank" rel="noopener noreferrer" aria-label={partner.name}>
                  {img}
                </a>
              ) : (
                <span key={partner._id}>{img}</span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};
