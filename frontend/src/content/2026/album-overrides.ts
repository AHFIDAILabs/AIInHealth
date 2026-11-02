// Display-layer corrections applied on top of whatever title Flickr's API
// actually returns for each album — never edits Flickr itself. Source: the
// brief's own Appendix A (docs/AIHS-2027-platform-brief.md), which already
// cites two raw-Flickr typos ("non communicabme", "Apreciation") corrected
// below. Keyed by album ID rather than string-replacing the raw title, since
// the exact raw typo text isn't available to this file — only the brief's
// already-cleaned version is, and keying by ID is more robust anyway.
//
// `day` groups the "Sessions in pictures" view (section 8.2). Two albums
// have no "Day N" prefix in their own Flickr title; their `day` below is
// INFERRED from their position in the brief's chronological listing, not
// stated outright — flagged with `dayInferred: true` so whoever reviews this
// can confirm or correct it before it ships.
export type AlbumDay = 'day1' | 'day2' | 'special';

export interface AlbumOverride {
  id: string;
  displayTitle: string;
  day: AlbumDay;
  dayInferred?: true;
  hidden?: true;
}

export const ALBUM_OVERRIDES: Record<string, AlbumOverride> = {
  '72177720336250147': { id: '72177720336250147', displayTitle: 'Welcome Remarks — Why Country AI-in-Health Frameworks? Why Now?', day: 'day1' },
  '72177720336251165': { id: '72177720336251165', displayTitle: 'Country-Led AI-in-Health Frameworks — The Global Evidence (Marelize Gorgens)', day: 'day1' },
  '72177720336257296': { id: '72177720336257296', displayTitle: 'Reaching the Last Mile: Can AI Reach the Ones the System Misses?', day: 'day1' },
  '72177720336250820': { id: '72177720336250820', displayTitle: 'Fireside Chat — AI & Emerging Tech in Media Communication for Change', day: 'day1' },
  '72177720336256881': { id: '72177720336256881', displayTitle: 'AI in Health Masterclass', day: 'day1' },
  '72177720336267648': { id: '72177720336267648', displayTitle: 'Women in AI & Health Special Session', day: 'day1' },
  '72177720336257466': { id: '72177720336257466', displayTitle: 'GIZ High-Level Stakeholder Roundtable on AI for Public Health Intelligence, Surveillance & Outbreak Prediction', day: 'day1' },
  '72177720336297724': { id: '72177720336297724', displayTitle: "Sovereign by Design: Africa's Choice on Health Data and AI", day: 'day1' },
  '72177720336297634': { id: '72177720336297634', displayTitle: 'AI on the Frontlines: Real-World Lessons from Public Health', day: 'day1' },
  '72177720336283908': { id: '72177720336283908', displayTitle: 'How AI and Community-Led Innovation Can Build Trust and Improve Health Outcomes', day: 'day1' },
  '72177720336332953': { id: '72177720336332953', displayTitle: 'From Digital Readiness to AI-Ready Public Health Systems', day: 'day1' },
  '72177720336285063': { id: '72177720336285063', displayTitle: 'Translating Intelligence into Impact — Strategy for AI-Enabled Health Systems', day: 'day1' },
  '72177720336284763': { id: '72177720336284763', displayTitle: 'From Idea to Scale: Funding and Scaling Your Health Innovation', day: 'day1' },
  '72177720336268315': { id: '72177720336268315', displayTitle: 'AI-Enabled Health Service Delivery, Public Health Intelligence & National Preparedness (Oral Presentation)', day: 'day1' },
  '72177720336299114': { id: '72177720336299114', displayTitle: 'Oral Presentation', day: 'day1' },
  '72177720336322256': { id: '72177720336322256', displayTitle: 'Innovation Showcase Experience', day: 'day1' },
  '72177720336274081': { id: '72177720336274081', displayTitle: 'Exhibition Booth Experience', day: 'day1' },
  '72177720336261322': { id: '72177720336261322', displayTitle: 'Registration & Entrance', day: 'day1' },
  '72177720336267566': { id: '72177720336267566', displayTitle: 'Networking', day: 'day1' },
  '72177720336286198': { id: '72177720336286198', displayTitle: 'Audience Experience', day: 'day1' },
  '72177720336267390': { id: '72177720336267390', displayTitle: 'Cocktail Reception', day: 'day1' },

  '72177720336269393': { id: '72177720336269393', displayTitle: 'High-Level Ministerial Long Table', day: 'day2' },
  '72177720336290079': { id: '72177720336290079', displayTitle: 'Keynote 2 — Dr. Pavel Ursu, WHO Representative and Head of Mission', day: 'day2', dayInferred: true },
  '72177720336272278': { id: '72177720336272278', displayTitle: 'Dr. Kunle Kakanfo', day: 'day2' },
  '72177720336260241': { id: '72177720336260241', displayTitle: 'Governing AI for Health: Ethics, Research, Trust and Collective Action', day: 'day2' },
  '72177720336296081': { id: '72177720336296081', displayTitle: "Safe by Design: Architecting Nigeria's AI Governance, Regulatory Framework and Ecosystem Roadmap", day: 'day2' },
  '72177720336265700': { id: '72177720336265700', displayTitle: "Data Before Models: Building Africa's AI-Ready Public Health Infrastructure", day: 'day2' },
  '72177720336270100': { id: '72177720336270100', displayTitle: 'Agentic AI for Health: Compute, Cloud, Clinical Records & Interoperability', day: 'day2' },
  '72177720336264902': { id: '72177720336264902', displayTitle: 'Building Trust by Design (CHAI)', day: 'day2' },
  '72177720336283709': { id: '72177720336283709', displayTitle: 'The Doctor in Your Pocket: AI, Trust and the Everyday Patient', day: 'day2' },
  '72177720336270748': { id: '72177720336270748', displayTitle: 'From Logistics to Health Systems Strengthening Algorithm', day: 'day2' },
  '72177720336322904': { id: '72177720336322904', displayTitle: 'From Reactive Follow-up to Integrated Predictive Healthcare Management', day: 'day2' },
  '72177720336280862': { id: '72177720336280862', displayTitle: 'Scaling AI-Enabled Tooling to Improve Maternal & Child Health Outcomes', day: 'day2' },
  '72177720336314404': { id: '72177720336314404', displayTitle: 'Case Study: AI in Cardiovascular Health and Non-Communicable Diseases', day: 'day2' },
  '72177720336281935': { id: '72177720336281935', displayTitle: 'Artificial Intelligence & Robotics in Clinical Surgical Care', day: 'day2', dayInferred: true },
  '72177720336287801': { id: '72177720336287801', displayTitle: 'AI-Enabled Health Innovation and Intellectual Property: From Idea to Impact', day: 'day2' },
  '72177720336287148': { id: '72177720336287148', displayTitle: 'Harnessing AI for Public Health Intelligence and Epidemic Preparedness', day: 'day2' },
  '72177720336271851': { id: '72177720336271851', displayTitle: 'Harnessing AI for Public Health Intelligence and Epidemic Preparedness & Oral Presentation', day: 'day2' },
  '72177720336269280': { id: '72177720336269280', displayTitle: 'Dissemination: AI and the Digitization of Healthcare Services in Nigeria (Landscape Assessment)', day: 'day2' },
  '72177720336311984': { id: '72177720336311984', displayTitle: 'No App. No Literacy. Voice AI for Last-Mile Health Delivery', day: 'day2' },
  '72177720336276381': { id: '72177720336276381', displayTitle: 'Oral Abstracts 3 (Best-of)', day: 'day2' },
  '72177720336251362': { id: '72177720336251362', displayTitle: 'Investment & Sustainable Funding', day: 'day2' },
  '72177720336273745': { id: '72177720336273745', displayTitle: 'Innovators Presentation and Award', day: 'day2' },
  '72177720336285814': { id: '72177720336285814', displayTitle: 'Presentations & Awards to Best Innovators & Abstract Presenters', day: 'day2' },
  '72177720336255405': { id: '72177720336255405', displayTitle: 'Volunteers & Staff Appreciation', day: 'day2' },

  '72177720336311834': { id: '72177720336311834', displayTitle: 'Highlights & Short Interviews', day: 'special' },
};
