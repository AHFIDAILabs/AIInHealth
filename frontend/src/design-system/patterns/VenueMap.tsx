import { ExternalLink } from 'lucide-react';
import { VENUE_NAME, VENUE_MAPS_EMBED_SRC, VENUE_MAPS_LINK } from '../../lib/siteInfo';

interface VenueMapProps {
  className?: string;
  height?: number;
}

// Keyless Google Maps embed — see lib/siteInfo.ts for why this needs no API
// key. The "Get Directions" link opens the same address in the visitor's own
// Maps app (mobile) or a new tab (desktop), which the plain iframe can't do.
export const VenueMap = ({ className = '', height = 320 }: VenueMapProps) => (
  <div className={`overflow-hidden rounded-2xl border border-slate-200 ${className}`}>
    <iframe
      title={`Map to ${VENUE_NAME}`}
      src={VENUE_MAPS_EMBED_SRC}
      width="100%"
      height={height}
      style={{ border: 0, display: 'block' }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
    <a
      href={VENUE_MAPS_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-secondary"
    >
      <ExternalLink size={15} /> Get Directions on Google Maps
    </a>
  </div>
);
