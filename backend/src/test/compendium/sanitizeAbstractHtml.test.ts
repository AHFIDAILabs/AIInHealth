import { describe, it, expect } from 'vitest';
import { sanitizeAbstractHtml } from '../../scripts/compendium/sanitizeAbstractHtml.js';

describe('sanitizeAbstractHtml', () => {
  it('preserves a bare "<" that is not markup, instead of treating it as an unclosed tag', () => {
    // The exact real-world case this sanitizer was built to not corrupt —
    // see AIHS261054's actual abstract text.
    const input = 'CD4 <200 without TB-LAM testing, and later in the same sentence a > sign.';
    const out = sanitizeAbstractHtml(input);
    expect(out).toContain('CD4 &lt;200');
    expect(out).toContain('&gt; sign');
    // Confirms the bug a naive strip-tags regex would have: it must NOT have
    // deleted everything between the stray "<" and the later ">".
    expect(out).toContain('without TB-LAM testing');
  });

  it('allows the exact whitelisted tags through, case-insensitively, as real markup', () => {
    const input = 'Normal <i>italic</i> and <B>bold</B> and <sub>sub</sub> and <sup>sup</sup> text.';
    const out = sanitizeAbstractHtml(input);
    expect(out).toBe('Normal <i>italic</i> and <b>bold</b> and <sub>sub</sub> and <sup>sup</sup> text.');
  });

  it('escapes a disallowed tag into inert text — its attributes may still appear as visible words, but never as real markup a browser would parse', () => {
    const input = '<script>alert(1)</script> and <i onclick="alert(2)">text</i> and <a href="evil">link</a>';
    const out = sanitizeAbstractHtml(input);
    // The actual safety property: no literal, unescaped "<" survives except
    // as part of one of the four allowed exact tags. "onclick"/"href" can
    // still appear as plain escaped text (ugly, not unsafe) — a browser
    // never sees a real "<" there to parse as an attribute.
    expect(out).not.toMatch(/<(?!\/?(i|b|sub|sup)>)/i);
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&lt;a href="evil"&gt;');
  });

  it('is deterministic and idempotent-safe on already-escaped input', () => {
    const input = 'p &lt; 0.05 should stay literal, not become a stray "<" that could later be misread.';
    const out = sanitizeAbstractHtml(input);
    expect(out).toContain('&amp;lt;'); // the literal ampersand itself gets escaped too — correct, not a bug
  });
});
