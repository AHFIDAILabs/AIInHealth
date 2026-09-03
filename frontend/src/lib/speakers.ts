// Auto-picks up every file dropped into assets/images/Speakers/Speakers — same pattern
// as partnerLogos.ts — keyed by filename (without extension), which matches speaker
// `name` exactly since that's how the files were provided.
const photoModules = import.meta.glob('../assets/images/Speakers/Speakers/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const photoByName: Record<string, string> = Object.fromEntries(
  Object.entries(photoModules).map(([path, src]) => {
    const file = path.split('/').pop() ?? path;
    return [file.replace(/\.png$/i, '').trim(), src];
  })
);

export interface Speaker {
  id: string;
  name: string;
  title: string;
  track: string;
  photo?: string;
}

// Real roster, confirmed by AHFID — no invented names or bios here. Only name/title/
// track are populated because that's what's been confirmed; add full bios once supplied.
const ROSTER: Omit<Speaker, 'photo'>[] = [
  { id: 'ajala', name: 'Dr. Olubunmi Ajala', title: 'National Director, National Centre for AI & Robotics', track: 'Infrastructure & Data' },
  { id: 'fasawe', name: 'Dr. Adedolapo Fasawe', title: 'FCT Mandate Secretary of Health and Environment', track: 'Policy & Governance' },
  { id: 'anas', name: 'Dr. Salma Ibrahim Anas', title: 'Special Adviser on Health to the President of Nigeria', track: 'Policy & Governance' },
  { id: 'gwamna', name: 'Hon. Amos Gwamna', title: 'Chairman, House of Representatives Committee on Healthcare Services', track: 'Policy & Governance' },
  { id: 'banigo', name: 'Ipalibo Banigo', title: 'Chairman, Senate Committee on Health (Secondary & Tertiary)', track: 'Policy & Governance' },
  { id: 'philbert', name: 'Jean Philbert', title: 'Chief Digital Advisor, Africa CDC', track: 'Strategic Engagements' },
  { id: 'ojewale', name: 'Dr. Leke Ezekiel Ojewale', title: 'Senior Technical Adviser, National Digital Health Initiative', track: 'Infrastructure & Data' },
  { id: 'ursu', name: 'Pavel Ursu', title: 'WHO Country Lead', track: 'Strategic Engagements' },
];

export const FEATURED_SPEAKERS: Speaker[] = ROSTER.map((s) => ({ ...s, photo: photoByName[s.name] }));
