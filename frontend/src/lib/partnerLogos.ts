// Auto-picks up every file dropped into assets/images/LOGO — no manual import list to
// maintain as partners are added/removed.
const modules = import.meta.glob('../assets/images/LOGO/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

const nameFromPath = (path: string): string => {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.png$/i, '').replace(/_+$/, '').trim();
};

// Confirmed URLs only — logos without a confirmed entry render unclickable rather
// than risk linking to a guessed/wrong domain for a real organization.
const PARTNER_URLS: Record<string, string> = {
  'CCCRN': 'https://cccr-nigeria.org/',
  'Digital Health Africa': 'https://digitalhealth-africa.org/',
  'GGHN': 'https://gghnigeria.org/',
  'Heartland Alliance': 'https://heartlandalliancenigeria.org/',
  'Vaccine Network': 'https://thevaccinenetwork.org/',
  'West African Institute of Public Health': 'https://www.publichealth-edu.org/',
};

export const PARTNER_LOGOS: { name: string; src: string; url?: string }[] = Object.entries(modules)
  .map(([path, src]) => {
    const name = nameFromPath(path);
    return { name, src, url: PARTNER_URLS[name] };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
