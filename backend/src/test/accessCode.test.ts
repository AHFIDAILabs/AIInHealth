import { describe, it, expect } from 'vitest';
import { useTestDb, seedAndLoginAdmin } from './helpers.js';
import { AccessCode } from '../models/AccessCode.model.js';

describe('POST /api/v1/admin/access-codes — generate idempotency', () => {
  useTestDb();

  it('reuses an existing unused code for the same email instead of minting a second one', async () => {
    const admin = await seedAndLoginAdmin('super_admin');

    const first = await admin
      .post('/api/v1/admin/access-codes')
      .send({ type: 'volunteer', emails: ['recruit@example.com'] });
    expect(first.status).toBe(201);
    const firstCode = first.body.data[0].code;

    const second = await admin
      .post('/api/v1/admin/access-codes')
      .send({ type: 'volunteer', emails: ['recruit@example.com'] });
    expect(second.status).toBe(200); // nothing new minted
    expect(second.body.data[0].code).toBe(firstCode);

    const allCodes = await AccessCode.find({ issuedTo: 'recruit@example.com' });
    expect(allCodes).toHaveLength(1);
  });

  it('mints a fresh code once the existing one has been used', async () => {
    const admin = await seedAndLoginAdmin('super_admin');

    const first = await admin
      .post('/api/v1/admin/access-codes')
      .send({ type: 'volunteer', emails: ['recruit2@example.com'] });
    const firstCode = first.body.data[0].code;

    await AccessCode.updateOne({ code: firstCode }, { status: 'used' });

    const second = await admin
      .post('/api/v1/admin/access-codes')
      .send({ type: 'volunteer', emails: ['recruit2@example.com'] });
    expect(second.status).toBe(201);
    expect(second.body.data[0].code).not.toBe(firstCode);

    const allCodes = await AccessCode.find({ issuedTo: 'recruit2@example.com' });
    expect(allCodes).toHaveLength(2);
  });

  it('handles a mixed batch — some emails reused, some newly minted — correctly', async () => {
    const admin = await seedAndLoginAdmin('super_admin');

    const first = await admin.post('/api/v1/admin/access-codes').send({ type: 'volunteer', emails: ['a@example.com'] });
    const firstCode = first.body.data[0].code;

    const mixed = await admin
      .post('/api/v1/admin/access-codes')
      .send({ type: 'volunteer', emails: ['a@example.com', 'b@example.com'] });

    expect(mixed.status).toBe(201); // at least one new code was created
    const codesByEmail: Record<string, string> = Object.fromEntries(
      mixed.body.data.map((c: { issuedTo: string; code: string }) => [c.issuedTo, c.code])
    );
    expect(codesByEmail['a@example.com']).toBe(firstCode);
    expect(codesByEmail['b@example.com']).toBeDefined();
    expect(await AccessCode.countDocuments()).toBe(2);
  });
});
