import { describe, it, expect } from 'vitest';
import { optionalUrlField } from './validation';

describe('optionalUrlField', () => {
  it('accepts a URL that already has a protocol, unchanged', () => {
    expect(optionalUrlField.parse('https://example.com')).toBe('https://example.com');
  });

  it('prepends https:// to a bare domain instead of rejecting it', () => {
    expect(optionalUrlField.parse('example.com')).toBe('https://example.com');
  });

  it('passes an empty string through as-is (optional field)', () => {
    expect(optionalUrlField.parse('')).toBe('');
  });

  it('passes undefined through as-is (optional field)', () => {
    expect(optionalUrlField.parse(undefined)).toBeUndefined();
  });

  it('still rejects genuinely malformed input', () => {
    expect(() => optionalUrlField.parse('not a url at all!!')).toThrow();
  });
});
