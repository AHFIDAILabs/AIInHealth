interface AbujaSkylineProps {
  className?: string;
  opacity?: number;
  /** 'onDark' (default) uses a light slate fill for navy backgrounds; 'onLight' uses
   * a darker navy fill so the same motif stays legible on white/offwhite sections. */
  tone?: 'onDark' | 'onLight';
  /** Full-color mode — teal hills, navy buildings, and full-strength orange accents,
   * rendered near-opaque instead of the faint tone-on-tone watermark the other pages
   * use. Built for the Speaker card, where the skyline sits low-contrast against a
   * bright card color and needs to read as a real illustration, not a shadow. */
  vivid?: boolean;
}

/**
 * Hand-built line-art silhouette of the Abuja skyline — the brand's one real visual
 * differentiator (see Visual Ground Truth, Section 6). Left to right: rolling hills,
 * the suspension bridge, the Millennium/Nigeria Tower with its orange observation pod,
 * mid-rise CBD blocks with lit windows, and the National Christian Centre spire.
 *
 * This is a reconstruction from the written spec, not the original Artwork.tsx paths —
 * swap in AHFID's actual source SVG here if/when it's available, for pixel accuracy.
 */
export const AbujaSkyline = ({ className = '', opacity, tone = 'onDark', vivid = false }: AbujaSkylineProps) => {
  const fill = tone === 'onDark' ? '#94A3B8' : '#334155';
  // vivid mode swaps the single tone-on-tone `fill` for real brand colors per
  // element, and defaults to near-opaque unless the caller overrides it —
  // the whole point is to stop reading as a faint watermark.
  const groupOpacity = opacity ?? (vivid ? 0.95 : 0.3);
  const hillsFill = vivid ? '#0D9488' : fill;
  const bridgeStroke = vivid ? '#14213D' : fill;
  const towerFill = vivid ? '#14213D' : fill;
  const blocksFill = vivid ? '#14213D' : fill;
  const windowFill = '#E8792C';
  const windowOpacity = vivid ? 1 : 0.6;
  const domeFill = vivid ? '#14213D' : fill;
  const spireFill = vivid ? '#14213D' : fill;
  const fillerFill = vivid ? '#0D9488' : fill;
  const fillerOpacity = vivid ? 0.85 : 0.7;
  const groundStroke = vivid ? '#E8792C' : fill;

  return (
    <svg viewBox="0 0 1440 220" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <g opacity={groupOpacity}>
        {/* rolling hills / Zuma Rock contour */}
        <path
          d="M0 190 C 60 160, 120 175, 170 150 C 210 130, 230 120, 260 140 C 300 165, 340 175, 400 190 L 400 220 L 0 220 Z"
          fill={hillsFill}
        />

        {/* suspension bridge */}
        <g stroke={bridgeStroke} strokeWidth="3">
          <line x1="430" y1="80" x2="430" y2="190" />
          <line x1="560" y1="60" x2="560" y2="190" />
          <path d="M430 90 Q 495 40 560 68" />
          <path d="M400 170 L430 100" />
          <path d="M460 170 L430 110" />
          <path d="M490 170 L560 78" />
          <path d="M520 170 L560 90" />
          <path d="M550 170 L560 100" />
          <line x1="400" y1="190" x2="620" y2="190" strokeWidth="4" />
        </g>

        {/* Millennium / Nigeria Tower with orange observation pod */}
        <g>
          <rect x="678" y="40" width="10" height="150" fill={towerFill} />
          <circle cx="683" cy="70" r="16" fill="#E8792C" />
          <rect x="681" y="20" width="4" height="24" fill={vivid ? '#0D9488' : '#5B7FA6'} />
        </g>

        {/* CBD mid-rise blocks with lit window dots */}
        <g fill={blocksFill}>
          <rect x="720" y="120" width="46" height="70" />
          <rect x="772" y="95" width="52" height="95" />
          <rect x="830" y="130" width="40" height="60" />
          <rect x="876" y="105" width="48" height="85" />
          <rect x="930" y="140" width="36" height="50" />
        </g>
        <g fill={windowFill} opacity={windowOpacity}>
          <rect x="728" y="132" width="4" height="4" />
          <rect x="740" y="145" width="4" height="4" />
          <rect x="782" y="110" width="4" height="4" />
          <rect x="796" y="130" width="4" height="4" />
          <rect x="808" y="150" width="4" height="4" />
          <rect x="884" y="120" width="4" height="4" />
          <rect x="898" y="140" width="4" height="4" />
        </g>

        {/* National Mosque dome */}
        <g fill={domeFill}>
          <path d="M980 190 L980 165 A 26 26 0 0 1 1032 165 L1032 190 Z" />
          <rect x="1000" y="140" width="4" height="26" />
          <circle cx="1002" cy="136" r="4" fill={vivid ? '#E8792C' : domeFill} />
        </g>

        {/* National Christian Centre spire */}
        <g fill={spireFill}>
          <path d="M1080 190 L1090 40 L1100 190 Z" />
          <path d="M1085 190 L1090 90 L1095 190 Z" fill="#0F172A" opacity={0.4} />
        </g>

        {/* low skyline filler toward the right edge */}
        <g fill={fillerFill} opacity={fillerOpacity}>
          <rect x="1140" y="150" width="60" height="40" />
          <rect x="1210" y="130" width="44" height="60" />
          <rect x="1264" y="160" width="70" height="30" />
          <rect x="1344" y="140" width="50" height="50" />
        </g>

        <line x1="0" y1="190" x2="1440" y2="190" stroke={groundStroke} strokeWidth="2" />
      </g>
    </svg>
  );
};
