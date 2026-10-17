// Manually reasoned sector/seniority calls for the current (2026-10-17)
// published speaker list — NOT a keyword classifier. Each entry here was
// read and judged individually against the brief's sector/seniority
// definitions; several are genuinely ambiguous and are flagged as such in
// `notes` for human review rather than silently forced into a category.
//
// When the speaker list changes (re-run exportSpeakersForAnalytics.ts, then
// `npm run categorize`), any speaker whose `id` isn't in this lookup gets a
// blank sector/seniority and a "NEEDS REVIEW" note instead of a guess — see
// categorize.ts. Add their row here once you've reviewed it.
export type Sector =
  | 'Federal Government & Agencies'
  | 'Legislature'
  | 'Multilateral & UN'
  | 'Bilateral Donors'
  | 'Implementing Partners & NGOs'
  | 'Academia & Research'
  | 'Private Sector, Startups & Industry'
  | 'Networks & Associations';

export type Seniority =
  | 'Minister / Legislator / Presidential Adviser'
  | 'Head of Organisation'
  | 'Senior Leader'
  | 'Expert / Practitioner';

// Canonical display order — the exact order the brief lists both lists in,
// so the bar chart always reads the same way regardless of CSV row order.
export const SECTOR_DISPLAY_ORDER: Sector[] = [
  'Federal Government & Agencies',
  'Legislature',
  'Multilateral & UN',
  'Bilateral Donors',
  'Implementing Partners & NGOs',
  'Academia & Research',
  'Private Sector, Startups & Industry',
  'Networks & Associations',
];

export const SENIORITY_DISPLAY_ORDER: Seniority[] = [
  'Minister / Legislator / Presidential Adviser',
  'Head of Organisation',
  'Senior Leader',
  'Expert / Practitioner',
];

export interface SpeakerCategory {
  sector: Sector;
  seniority: Seniority;
  notes?: string;
}

export const CATEGORY_BY_ID: Record<string, SpeakerCategory> = {
  '6ab7b73af3247d6b5608c019': {
    sector: 'Federal Government & Agencies',
    seniority: 'Minister / Legislator / Presidential Adviser',
  },
  '6aaeaf8edfd437617e0b6323': {
    sector: 'Federal Government & Agencies',
    seniority: 'Minister / Legislator / Presidential Adviser',
    notes: 'Special Adviser to the President — presidential adviser tier.',
  },
  '6ab632684d8fc19a4c8844cf': {
    sector: 'Federal Government & Agencies',
    seniority: 'Head of Organisation',
    notes: 'Organisation (NITDA) missing from source CSV row — inferred from title only, not shown in chart grid since org field is blank.',
  },
  '6a99b0668712c3e199571181': {
    sector: 'Multilateral & UN',
    seniority: 'Head of Organisation',
    notes: 'Smart Africa is a Pan-African intergovernmental digital alliance, not literally a UN body — closest fit to the listed Multilateral & UN examples. Please confirm.',
  },
  '6aaeaea6dfd437617e0b630b': {
    sector: 'Federal Government & Agencies',
    seniority: 'Head of Organisation',
    notes: '"National Director" of a national centre read as its top executive — please confirm vs. Senior Leader.',
  },
  '6aaeb1d4dfd437617e0b6397': {
    sector: 'Multilateral & UN',
    seniority: 'Head of Organisation',
    notes: 'WHO Country Representative is the top WHO official for Nigeria.',
  },
  '6aaeb1fcdfd437617e0b639d': { sector: 'Networks & Associations', seniority: 'Head of Organisation' },
  '6ab6332b4d8fc19a4c884506': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' },
  '6ab634f04d8fc19a4c884594': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' },
  '6ab6362a4d8fc19a4c8845c3': {
    sector: 'Academia & Research',
    seniority: 'Senior Leader',
    notes: 'Professor + Lead Investigator, no head-of-unit title given — please confirm vs. Expert/Practitioner.',
  },
  '6abdec1330c3b6f6b3278852': { sector: 'Multilateral & UN', seniority: 'Senior Leader' },
  '6abdec8930c3b6f6b3278865': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Head of Organisation',
    notes: 'Data Science Nigeria is a tech/AI capacity-building social enterprise — could also read as Implementing Partners & NGOs. Please confirm.',
  },
  '6ab1261e9f24233412e49be6': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' },
  '6ab633884d8fc19a4c884520': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' },
  '6a99827723bf521fb723bcf3': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Head of Organisation',
    notes: 'AI4SID reads as a founder-led initiative/venture rather than a large NGO — could also fit Implementing Partners & NGOs. Please confirm.',
  },
  '6ab633b04d8fc19a4c88452d': { sector: 'Networks & Associations', seniority: 'Head of Organisation' },
  '6acbfe93c6b6a1fb16382248': { sector: 'Networks & Associations', seniority: 'Head of Organisation' },
  '6ab633f24d8fc19a4c884546': {
    sector: 'Networks & Associations',
    seniority: 'Head of Organisation',
    notes: 'Executive Secretary heads the CCM secretariat.',
  },
  '6ab634884d8fc19a4c884573': {
    sector: 'Multilateral & UN',
    seniority: 'Senior Leader',
    notes: 'WIPO Director (divisional), not the agency\'s overall head.',
  },
  '6ab632d14d8fc19a4c8844ed': { sector: 'Academia & Research', seniority: 'Head of Organisation' },
  '6aaeb066dfd437617e0b6363': {
    sector: 'Federal Government & Agencies',
    seniority: 'Senior Leader',
    notes: 'Senior Technical Adviser to a national programme, not a ministerial/presidential adviser.',
  },
  '6ab636874d8fc19a4c8845d5': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' },
  '6ab636c44d8fc19a4c8845e2': {
    sector: 'Networks & Associations',
    seniority: 'Head of Organisation',
    notes: '"Co-Convener" of DHIN read as a founding/leading role — please confirm vs. Senior Leader (Technology Lead alone).',
  },
  '6ab636ff4d8fc19a4c8845eb': {
    sector: 'Multilateral & UN',
    seniority: 'Expert / Practitioner',
    notes: 'National Professional Officer is a standard WHO technical staff grade.',
  },
  '6ab637554d8fc19a4c88461d': { sector: 'Academia & Research', seniority: 'Senior Leader' },
  '6acbff9ac6b6a1fb16382269': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Senior Leader',
    notes: '"Representative / Executive Lead" doesn\'t clearly confirm top-of-organisation — please confirm vs. Head of Organisation.',
  },
  '6ab16422a46cb1eb9db11eed': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' },
  '6ab637904d8fc19a4c884634': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' },
  '6ab637b84d8fc19a4c884641': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' },
  '6ab637d54d8fc19a4c884649': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' },

  // Added 2026-10-17 — real, complete data despite sitting in draft (public
  // bio copy still being finalized), per explicit instruction to include
  // every speaker with usable data, not just already-published ones.
  '6ac806e03acdc4e3563a183d': {
    sector: 'Federal Government & Agencies',
    seniority: 'Minister / Legislator / Presidential Adviser',
  },
  '6aaeaf2bdfd437617e0b631d': {
    sector: 'Federal Government & Agencies',
    seniority: 'Minister / Legislator / Presidential Adviser',
    notes: 'FCT Mandate Secretary is a territorial-cabinet-equivalent role. Organisation left blank — not on file; inferring "FCT Administration" would be a guess.',
  },
  '6aaeb19bdfd437617e0b638c': {
    sector: 'Legislature',
    seniority: 'Minister / Legislator / Presidential Adviser',
    notes: 'Organisation left blank — not on file (role is Senate Committee Chairman, not tied to a named external organisation).',
  },

  // Added 2026-10-17 — second speaker batch (51 entries, reviewed individually).
  '6ad3ebeab489e51a5f5e82c8': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Yerima Abubakar, CHAI
  '6ad3ebf9b489e51a5f5e8300': {
    sector: 'Bilateral Donors',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file — defaulted to Expert/Practitioner.',
  }, // Shalewa Oyelaran, US Dept of State
  '6ad3ebf8b489e51a5f5e82fe': { sector: 'Bilateral Donors', seniority: 'Senior Leader' }, // Dr. Fatima Hussaini, GIZ
  '6ad3ebf8b489e51a5f5e82fc': {
    sector: 'Multilateral & UN',
    seniority: 'Expert / Practitioner',
    notes: 'EU Delegation is a supranational diplomatic mission, not literally a UN body — closest fit. No title on file either.',
  }, // Dr. Ayeke Anthony, EU Delegation
  '6ad3ebf6b489e51a5f5e82f6': {
    sector: 'Multilateral & UN',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file — defaulted to Expert/Practitioner; please confirm seniority.',
  }, // Dr. Olumide Okunola, World Bank
  '6ad3ebf6b489e51a5f5e82f4': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // John Chinonyerem Njoku, R4D
  '6ad3ebf4b489e51a5f5e82ee': { sector: 'Academia & Research', seniority: 'Head of Organisation' }, // Prof. Olayinka David-West, Dean LBS
  '6ad3ebf2b489e51a5f5e82e8': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Steve Job Pam, APIN
  '6ad3ebf0b489e51a5f5e82e2': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Johnson Alonge, APIN (PHIS3)
  '6ad3ebefb489e51a5f5e82dc': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Gibril Gomez, APIN (PHIS3)
  '6ad3ebedb489e51a5f5e82d6': {
    sector: 'Federal Government & Agencies',
    seniority: 'Senior Leader',
    notes: 'Title references a Federal Ministry of Health directorship (DPRS) though organisation on file says APIN (PHIS3) — classified by actual role. Please confirm.',
  }, // Dr Gbenga Ijaodola
  '6ad3ebecb489e51a5f5e82d2': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Boluwatito Adeyemi, CHAI
  '6ad3ebecb489e51a5f5e82ce': { sector: 'Implementing Partners & NGOs', seniority: 'Expert / Practitioner' }, // Kehinde Muraina, CHAI
  '6ad3ebfab489e51a5f5e8306': { sector: 'Legislature', seniority: 'Minister / Legislator / Presidential Adviser' }, // Senator Tejuoso
  '6ad3ebe8b489e51a5f5e82c2': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Jibrin Kama, CHAI
  '6ad3ebe7b489e51a5f5e82bc': { sector: 'Implementing Partners & NGOs', seniority: 'Senior Leader' }, // Dr. Lilian Mutea, CHAI
  '6ad3ebe5b489e51a5f5e82b6': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Expert / Practitioner',
    notes: 'Sydani Group does NGO-style health-systems implementation work too — could fit Implementing Partners & NGOs. No title on file.',
  }, // Mr Akolade Jimoh, Sydani Group
  '6ad3ebe5b489e51a5f5e82b4': {
    sector: 'Federal Government & Agencies',
    seniority: 'Senior Leader',
    notes: 'RCSDC acronym not expanded in source data — best guess is a government-affiliated disease-surveillance body. Please confirm.',
  }, // Dr. Victor Fatimehin, RCSDC
  '6ad3ebe4b489e51a5f5e82b2': {
    sector: 'Federal Government & Agencies',
    seniority: 'Expert / Practitioner',
    notes: 'NHTDAO = National Health Technology & Data Analytics Office (same agency as Dr. Obi Adigwe). No title on file.',
  }, // Charles Balogun, NHTDAO
  '6ad3ebe2b489e51a5f5e82ac': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' }, // Prof. Ifeoma Okoye, Breasts Without Spots
  '6ad3ebe1b489e51a5f5e82a6': { sector: 'Networks & Associations', seniority: 'Head of Organisation' }, // Dr. Zainab Kwaru, MWAN
  '6ad3ebdfb489e51a5f5e82a0': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' }, // Nadia Albanna
  '6ad3ebdbb489e51a5f5e8295': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' }, // Kemisola Bolarinwa
  '6ad3ec05b489e51a5f5e8332': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' }, // Dr. Iyore James, RoboMed Global
  '6ad3ec1ab489e51a5f5e837a': {
    sector: 'Federal Government & Agencies',
    seniority: 'Senior Leader',
    notes: 'Galaxy Backbone is a federal government-owned ICT infrastructure company.',
  }, // Engr. Kazeem Sulaiman
  '6ad3ec18b489e51a5f5e8374': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Dr. Bayo Mohammed Onimode
  '6ad3ec16b489e51a5f5e836e': { sector: 'Academia & Research', seniority: 'Expert / Practitioner' }, // Elisabeth Wamcha, Strathmore
  '6ad3ec14b489e51a5f5e8368': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // A. Ogbesor, NISA Premier
  '6ad3ec12b489e51a5f5e8362': { sector: 'Networks & Associations', seniority: 'Head of Organisation' }, // Moji Makanjuola
  '6ad3ec11b489e51a5f5e835c': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // G. Benjamin, NISA Premier
  '6ad3ec0fb489e51a5f5e8356': { sector: 'Multilateral & UN', seniority: 'Senior Leader' }, // Kshitij Joshi, UNICEF
  '6ad3ec0db489e51a5f5e8350': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // Wesley Ekeruo, RoboMed Global
  '6ad3ec0cb489e51a5f5e834a': {
    sector: 'Multilateral & UN',
    seniority: 'Senior Leader',
    notes: 'Gates Foundation is a major philanthropic global-health funder, not literally UN/multilateral, but operates in that space similarly to Gavi. Please confirm.',
  }, // Joseph Oteri, Gates Foundation
  '6ad3ec0ab489e51a5f5e8344': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Tagbo Azubike, RoboMed Global
  '6ad3ec08b489e51a5f5e833e': {
    sector: 'Private Sector, Startups & Industry',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // Efosa Eluma, RoboMed Global
  '6ad3ec07b489e51a5f5e8338': {
    sector: 'Multilateral & UN',
    seniority: 'Senior Leader',
    notes: 'Organisation on file says "Vaccine Network For Disease Control" but email domain is gavi.org — likely a Gavi-affiliated programme. Please confirm.',
  }, // Daniel Oyaole
  '6ad3ec03b489e51a5f5e832c': { sector: 'Multilateral & UN', seniority: 'Expert / Practitioner' }, // Abdul Argungu Abubakar, WIPO
  '6ad3ec03b489e51a5f5e832a': { sector: 'Implementing Partners & NGOs', seniority: 'Expert / Practitioner' }, // Japhet Gaius Yakubu, GGHN
  '6ad3ec01b489e51a5f5e8324': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' }, // Mansura Yahaya Haruna, GGHN
  '6ad3ec01b489e51a5f5e8322': { sector: 'Implementing Partners & NGOs', seniority: 'Head of Organisation' }, // Mr. Dauda Majanbu, VillageReach
  '6ad3ec01b489e51a5f5e8320': { sector: 'Private Sector, Startups & Industry', seniority: 'Expert / Practitioner' }, // Dr. Ofem Obeten, DDP
  '6ad3ec00b489e51a5f5e831e': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Ebubechi Nwaononiwu, DDP
  '6ad3ec00b489e51a5f5e831c': {
    sector: 'Implementing Partners & NGOs',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // Dayo Adeyanju, MAMII
  '6ad3ebfeb489e51a5f5e8316': {
    sector: 'Implementing Partners & NGOs',
    seniority: 'Expert / Practitioner',
    notes: 'No title on file.',
  }, // Dr. Chukwunonso Nwaokorie, SCIDaR
  '6ad3ebfdb489e51a5f5e8310': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Godwin Adegbehingbe, DSN
  '6ad3ebfcb489e51a5f5e830e': { sector: 'Private Sector, Startups & Industry', seniority: 'Expert / Practitioner' }, // Ahmad Ibrahim, DSN
  '6ad3ebfbb489e51a5f5e8308': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Chinazo Anebelundu, DSN
  '6ad2411eac8ff5e79beee2bc': { sector: 'Private Sector, Startups & Industry', seniority: 'Senior Leader' }, // Stephanie Okpere, CcHub
  '6ad24131ac8ff5e79beee2f2': { sector: 'Private Sector, Startups & Industry', seniority: 'Head of Organisation' }, // Adetola Olateju, Seam Health
  '6ad24134ac8ff5e79beee2f6': { sector: 'Federal Government & Agencies', seniority: 'Senior Leader' }, // Dr. Mariam Abdullahi, NCAIR
  '6ad24135ac8ff5e79beee2fa': {
    sector: 'Implementing Partners & NGOs',
    seniority: 'Expert / Practitioner',
    notes: 'Real title still not on file (placeholder "Details pending") — only organisation (Jacaranda Health) is confirmed. Please confirm seniority once title is known.',
  }, // Dr. Ufuma Omo-Obi, Jacaranda Health
};

// Speakers deliberately excluded from the graphic, with the reason on
// record — distinct from an incomplete-profile exclusion (see
// categorize.ts's isIncompleteProfile): this person has real, usable data
// but a stated reason rules them out anyway.
export const EXCLUDED_IDS: Record<string, string> = {
  '6ac806e03acdc4e3563a183b': "Confirmed not attending the event (2026-10-17) — excluded from 'Who's Speaking' despite having a complete profile.",
};
