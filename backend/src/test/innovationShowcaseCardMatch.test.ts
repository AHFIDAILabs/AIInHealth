import { describe, it, expect } from 'vitest';
import { useTestDb, seedAndLoginAdmin } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { InnovationShowcaseEntry } from '../models/InnovationShowcaseEntry.model.js';

const createConfirmedInnovator = (companyName: string, contactEmail: string) =>
  Registration.create({
    type: 'innovator',
    companyName,
    contactName: 'Test Founder',
    contactEmail,
    contactPhone: '+2348000000000',
    status: 'confirmed',
    isActive: true,
  });

describe('POST /api/v1/admin/innovation-showcase-entries/card/match-emails', () => {
  useTestDb();

  it('fills a matching entry\'s showcaseCard.contactEmail by case-insensitive startup/company name', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await createConfirmedInnovator('MamaCare', 'founder@mamacare.example');
    await InnovationShowcaseEntry.create({ startupName: 'mamacare' }); // deliberately different case

    const res = await admin.post('/api/v1/admin/innovation-showcase-entries/card/match-emails').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.filled).toEqual([{ startupName: 'mamacare', contactEmail: 'founder@mamacare.example' }]);
    expect(res.body.data.alreadySet).toEqual([]);
    expect(res.body.data.noMatch).toEqual([]);

    const entry = await InnovationShowcaseEntry.findOne({ startupName: 'mamacare' });
    expect(entry?.get('showcaseCard.contactEmail')).toBe('founder@mamacare.example');
  });

  it('never overwrites a contactEmail an admin already set manually', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await createConfirmedInnovator('Housejob.ng', 'new@housejob.example');
    const entry = await InnovationShowcaseEntry.create({ startupName: 'HouseJob.ng' });
    entry.set('showcaseCard.contactEmail', 'already-set@housejob.example');
    await entry.save();

    const res = await admin.post('/api/v1/admin/innovation-showcase-entries/card/match-emails').send({});
    expect(res.body.data.filled).toEqual([]);
    expect(res.body.data.alreadySet).toEqual([{ startupName: 'HouseJob.ng', existingEmail: 'already-set@housejob.example' }]);

    const unchanged = await InnovationShowcaseEntry.findById(entry.id);
    expect(unchanged?.get('showcaseCard.contactEmail')).toBe('already-set@housejob.example');
  });

  it('reports a confirmed innovator with no matching showcase entry as noMatch, not an error', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await createConfirmedInnovator('Lafiyar Iyali (Family Health)', 'contact@lafiyar.example');
    // No InnovationShowcaseEntry created at all — this innovator never applied to the Showcase.

    const res = await admin.post('/api/v1/admin/innovation-showcase-entries/card/match-emails').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.noMatch).toEqual([{ companyName: 'Lafiyar Iyali (Family Health)' }]);
    expect(res.body.data.filled).toEqual([]);
  });

  it('ignores non-confirmed innovator registrations', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await Registration.create({
      type: 'innovator',
      companyName: 'StillPending',
      contactName: 'Test Founder',
      contactEmail: 'pending@example.com',
      status: 'pending',
      isActive: true,
    });
    await InnovationShowcaseEntry.create({ startupName: 'StillPending' });

    const res = await admin.post('/api/v1/admin/innovation-showcase-entries/card/match-emails').send({});
    expect(res.body.data.filled).toEqual([]);
    expect(res.body.data.noMatch).toEqual([]);
  });
});
