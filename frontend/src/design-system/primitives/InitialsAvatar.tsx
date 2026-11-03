const PALETTES = [
  'from-navy to-navy-secondary',
  'from-[#3a2415] to-navy',
  'from-navy-secondary to-[#0F172A]',
  'from-[#4a2f1a] to-navy-secondary',
];

const initials = (name: string) =>
  name
    .replace(/^(Dr\.|Hon\.|Prof\.)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const hashIndex = (name: string, mod: number) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % mod;
};

interface InitialsAvatarProps {
  name: string;
  className?: string;
}

// Branded stand-in for a real headshot — a deterministic navy/brown gradient tile with
// initials, so a missing photo still reads as intentional rather than a broken image.
export const InitialsAvatar = ({ name, className = '' }: InitialsAvatarProps) => (
  <div
    className={`flex items-center justify-center bg-gradient-to-br ${PALETTES[hashIndex(name, PALETTES.length)]} ${className}`}
  >
    <span className="font-display text-3xl font-semibold text-white/90">{initials(name)}</span>
  </div>
);
