import { describe, it, expect } from 'vitest';
import { useTestDb, seedAndLoginAdmin } from './helpers.js';

describe('POST /api/v1/admin/uploads/image — without Cloudinary configured', () => {
  useTestDb();

  it('returns a clear 503 rather than silently no-opping (there is no safe fake URL to hand back)', async () => {
    const admin = await seedAndLoginAdmin('super_admin');
    // A tiny valid 1x1 PNG, just enough to pass multer's fileFilter and reach the
    // cloudinaryConfigured check this test is actually exercising.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );

    const res = await admin.post('/api/v1/admin/uploads/image').attach('image', png, 'test.png');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('UPLOADS_NOT_CONFIGURED');
  });
});
