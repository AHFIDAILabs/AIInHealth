// Fallback album list for build-media-manifest.ts, used only when
// FLICKR_API_KEY isn't set (section 6.1's required resilience path — the
// gallery must never depend on the API being reachable). Source: the raw
// titles and counts from docs/AIHS-2027-platform-brief.md's Appendix A,
// typed in by hand from that document, not invented.
//
// When a real API key is available, build-media-manifest.ts ignores this
// entirely and calls flickr.photosets.getList directly instead — this list
// exists only so the pipeline has something real to run against right now.
export interface SeedAlbum {
  id: string;
  rawTitle: string;
  photoCount: number;
}

export const SEED_ALBUMS: SeedAlbum[] = [
  { id: '72177720336250147', rawTitle: 'DAY 1 - Welcome Remarks - Why Country AI-in-Health Frameworks? Why Now?', photoCount: 124 },
  { id: '72177720336251165', rawTitle: 'DAY 1 - Country-Led AI-in-Health Frameworks - The Global Evidence (Marelize Gorgens)', photoCount: 23 },
  { id: '72177720336257296', rawTitle: 'DAY 1 - Reaching the Last Mile: Can AI Reach the Ones the System Misses?', photoCount: 36 },
  { id: '72177720336250820', rawTitle: 'DAY 1 - Fireside chat - AI & Emerging Tech in Media Communication for Change', photoCount: 61 },
  { id: '72177720336256881', rawTitle: 'DAY 1 - AI in Health Masterclass', photoCount: 62 },
  { id: '72177720336267648', rawTitle: 'DAY 1 - Women in AI Health Special Session', photoCount: 69 },
  { id: '72177720336257466', rawTitle: 'DAY 1 - GIZ - High Level Stakeholder RoundTable on AI for Public Health Intelligence, Surveillance & Outbreak Prediction', photoCount: 82 },
  { id: '72177720336297724', rawTitle: "DAY 1 - Sovereign by Design: Africa's Choice on Health Data and AI", photoCount: 35 },
  { id: '72177720336297634', rawTitle: 'DAY 1 - AI on the Frontlines: Real-World Lessons from Public Health', photoCount: 25 },
  { id: '72177720336283908', rawTitle: 'DAY 1 - How AI and community-led innovation can build trust and improve health outcomes', photoCount: 26 },
  { id: '72177720336332953', rawTitle: 'DAY 1 - From Digital Readiness to AI-Ready Public Health Systems', photoCount: 14 },
  { id: '72177720336285063', rawTitle: 'DAY 1 - Translating Intelligence into Impact - Strategy for AI-Enabled Health Systems', photoCount: 17 },
  { id: '72177720336284763', rawTitle: 'DAY 1 - From Idea to Scale: Funding and Scaling Your Health Innovation', photoCount: 40 },
  { id: '72177720336268315', rawTitle: 'Day 1 - AI-Enabled Health Service Delivery, Public Health Intelligence & National Preparedness (oral presentation)', photoCount: 50 },
  { id: '72177720336299114', rawTitle: 'DAY 1 - Oral Presentation', photoCount: 29 },
  { id: '72177720336322256', rawTitle: 'DAY 1 - Innovation Showcase Experience', photoCount: 5 },
  { id: '72177720336274081', rawTitle: 'Day 1 - Exhibition Booth Experience', photoCount: 32 },
  { id: '72177720336261322', rawTitle: 'Day 1 - Registration & Entrance', photoCount: 65 },
  { id: '72177720336267566', rawTitle: 'Day 1 - Networking', photoCount: 78 },
  { id: '72177720336286198', rawTitle: 'Day 1 - Audience Experience', photoCount: 1 },
  { id: '72177720336267390', rawTitle: 'DAY 1 - Cocktail Reception', photoCount: 66 },
  { id: '72177720336269393', rawTitle: 'DAY 2 - High Level Ministerial Long Table', photoCount: 141 },
  { id: '72177720336290079', rawTitle: 'Keynote 2 - Dr. Pavel Ursu, WHO Representative and Head of Mission', photoCount: 26 },
  { id: '72177720336272278', rawTitle: 'Day 2 - Dr. Kunle Kakanfo', photoCount: 75 },
  { id: '72177720336260241', rawTitle: 'DAY 2 - Governing AI for Health: Ethics, Research, Trust and Collective Action', photoCount: 33 },
  { id: '72177720336296081', rawTitle: "DAY 2 - Safe by Design: Architecting Nigeria's AI Governance, Regulatory Framework and Ecosystem Roadmap", photoCount: 25 },
  { id: '72177720336265700', rawTitle: "DAY 2 - Data Before Models: Building Africa's AI-Ready Public Health Infrastructure", photoCount: 29 },
  { id: '72177720336270100', rawTitle: 'DAY 2 - Agentic AI for Health: Compute, Cloud, Clinical Records & Interoperability', photoCount: 13 },
  { id: '72177720336264902', rawTitle: 'DAY 2 - Building Trust by Design (CHAI)', photoCount: 20 },
  { id: '72177720336283709', rawTitle: 'DAY 2 - The Doctor in Your Pocket: AI, Trust and the Everyday Patient', photoCount: 41 },
  { id: '72177720336270748', rawTitle: 'DAY 2 - From Logistics to Health Systems Strengthening Algorithm', photoCount: 32 },
  { id: '72177720336322904', rawTitle: 'DAY 2 - From Reactive Follow-up to Integrated Predictive Healthcare Management', photoCount: 26 },
  { id: '72177720336280862', rawTitle: 'DAY 2 - Scaling AI-enabled Tooling to Improve Maternal & Child Health Outcomes', photoCount: 21 },
  { id: '72177720336314404', rawTitle: 'DAY 2 - Case Study: AI in Cardiovascular Health and Non-Communicable Diseases', photoCount: 6 },
  { id: '72177720336281935', rawTitle: 'Artificial Intelligence & Robotics in Clinical Surgical Care', photoCount: 10 },
  { id: '72177720336287801', rawTitle: 'DAY 2 - AI-enabled Health Innovation and Intellectual Property: From Idea to Impact', photoCount: 19 },
  { id: '72177720336287148', rawTitle: 'DAY 2 - Harnessing AI for Public Health Intelligence and Epidemic Preparedness', photoCount: 18 },
  { id: '72177720336271851', rawTitle: 'DAY 2 - Harnessing AI for Public Health Intelligence and Epidemic Preparedness & Oral Presentation', photoCount: 33 },
  { id: '72177720336269280', rawTitle: 'DAY 2 - Dissemination: AI and the Digitization of Healthcare Services in Nigeria (Landscape Assessment)', photoCount: 28 },
  { id: '72177720336311984', rawTitle: 'DAY 2 - Presentation: No App. No Literacy. Voice AI for Last-Mile Health Delivery', photoCount: 15 },
  { id: '72177720336276381', rawTitle: 'DAY 2 - Oral Abstracts 3 (Best-of)', photoCount: 21 },
  { id: '72177720336251362', rawTitle: 'Investment & Sustainable Funding (Day 2)', photoCount: 47 },
  { id: '72177720336273745', rawTitle: 'Day 2 - Innovators Presentation and Award', photoCount: 35 },
  { id: '72177720336285814', rawTitle: 'DAY 2 - Presentations & Awards to Best Innovators & Abstract Presenters', photoCount: 31 },
  { id: '72177720336255405', rawTitle: 'DAY 2 - Volunteers & Staff Appreciation', photoCount: 43 },
  { id: '72177720336311834', rawTitle: 'VIDEOS (Highlights, short interviews)', photoCount: 13 },
];
