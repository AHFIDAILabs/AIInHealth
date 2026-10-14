import { describe, it, expect } from 'vitest';
import { qrDataUrlForToken } from '../services/qr.service.js';

describe('qrDataUrlForToken', () => {
  it('returns a PNG data URI', async () => {
    const dataUrl = await qrDataUrlForToken('some-token');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('produces a different image when a custom dark colour is given', async () => {
    const standard = await qrDataUrlForToken('same-token');
    const recolored = await qrDataUrlForToken('same-token', '#15803D');
    expect(recolored).not.toBe(standard);
  });

  it('defaults to the same output as explicitly passing black', async () => {
    const implicitDefault = await qrDataUrlForToken('same-token-2');
    const explicitBlack = await qrDataUrlForToken('same-token-2', '#000000');
    expect(implicitDefault).toBe(explicitBlack);
  });
});
