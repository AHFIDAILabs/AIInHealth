import { describe, it, expect } from 'vitest';
import { useTestDb } from '../helpers.js';
import { ConfirmedAbstract, type ConfirmedAbstractDoc } from '../../models/ConfirmedAbstract.model.js';
import { buildExportRecord } from '../../scripts/compendium/exportSnapshot.js';

// All fixtures below are invented — no real abstract content, matching this
// project's "synthetic fixtures only in tests" rule.
const publishedFixture = {
  code: 'TEST0001',
  title: 'A Synthetic Test Title',
  authorName: 'Jane Doe', // the Presenters tab's own display field — never exported
  internalNotes: 'Admin-only note that must never leak into the export', // must never appear
  track: 'Test Track',
  presentationType: 'oral',
  language: 'en',
  authors: [{ name: 'Jane Doe', affiliation: 'Test University', isCorresponding: true, orcid: '0000-0000-0000-0001' }],
  abstractText: 'A synthetic abstract body for testing purposes only.',
  keywords: ['synthetic', 'testing'],
  compendium: {
    consentToPublish: { granted: true, method: 'form', evidenceNote: 'Internal evidence note — must never leak into the export' },
    publicationStatus: 'published',
    corrections: [{ date: new Date('2026-01-01T00:00:00Z'), note: 'Fixed a typo in the title.' }],
  },
} as unknown as ConfirmedAbstractDoc;

describe('buildExportRecord', () => {
  it('exports the exact allowlisted key set for a published record — nothing more', () => {
    const result = buildExportRecord(publishedFixture);
    expect(Object.keys(result).sort()).toEqual(
      ['code', 'title', 'status', 'authors', 'abstract', 'keywords', 'track', 'presentationType', 'sessionRef', 'language', 'corrections'].sort()
    );
  });

  it('never includes authorName, internalNotes, consent evidence, or any admin-only field', () => {
    const result = buildExportRecord(publishedFixture);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Admin-only note');
    expect(serialized).not.toContain('Internal evidence note');
    expect(serialized).not.toContain('authorName');
    expect(serialized).not.toContain('internalNotes');
  });

  it('never includes an email field — there is no such field on this model to begin with, by design', () => {
    const result = buildExportRecord(publishedFixture);
    expect(JSON.stringify(result).toLowerCase()).not.toContain('email');
  });

  it('exports a withdrawn record as a tombstone — code and title only, text truly absent (not blanked)', () => {
    const withdrawn = { ...publishedFixture, compendium: { ...publishedFixture.compendium, publicationStatus: 'withdrawn' } } as ConfirmedAbstractDoc;
    const result = buildExportRecord(withdrawn);
    expect(Object.keys(result).sort()).toEqual(['code', 'status', 'title']);
    expect(result).not.toHaveProperty('abstract');
    expect(result).not.toHaveProperty('authors');
    expect(result).not.toHaveProperty('keywords');
  });

  it('is deterministic — the same input produces structurally identical output every time', () => {
    const a = buildExportRecord(publishedFixture);
    const b = buildExportRecord(publishedFixture);
    expect(a).toEqual(b);
  });

  it('never guesses sessionRef — always null, since no reliable linkage exists', () => {
    const result = buildExportRecord(publishedFixture);
    expect(result.sessionRef).toBeNull();
  });
});

describe('export eligibility query (DB-level)', () => {
  useTestDb();

  const ELIGIBLE_FILTER = {
    'compendium.consentToPublish.granted': true,
    'compendium.publicationStatus': { $in: ['published', 'withdrawn'] },
  };

  it('never exports a record without recorded consent, even if marked published', async () => {
    await ConfirmedAbstract.create({
      code: 'TEST0002',
      authorName: 'No Consent',
      title: 'Should never be exported',
      compendium: { publicationStatus: 'published' }, // no consentToPublish at all
    });
    const eligible = await ConfirmedAbstract.find(ELIGIBLE_FILTER);
    expect(eligible).toHaveLength(0);
  });

  it('never exports a record still in draft/ready, even with consent recorded', async () => {
    await ConfirmedAbstract.create({
      code: 'TEST0003',
      authorName: 'Consented But Not Published',
      title: 'Should still not be exported',
      compendium: { consentToPublish: { granted: true, method: 'email', evidenceNote: 'test' }, publicationStatus: 'ready' },
    });
    const eligible = await ConfirmedAbstract.find(ELIGIBLE_FILTER);
    expect(eligible).toHaveLength(0);
  });

  it('exports exactly the records that have both consent AND published/withdrawn status', async () => {
    await ConfirmedAbstract.create({
      code: 'TEST0004',
      authorName: 'Correctly Published',
      title: 'Should be exported',
      compendium: { consentToPublish: { granted: true, method: 'email', evidenceNote: 'test' }, publicationStatus: 'published' },
    });
    const eligible = await ConfirmedAbstract.find(ELIGIBLE_FILTER);
    expect(eligible.map((d) => d.code)).toEqual(['TEST0004']);
  });
});
