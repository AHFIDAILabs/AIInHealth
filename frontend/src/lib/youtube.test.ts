import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId, youTubeEmbedUrl } from './youtube';

describe('extractYouTubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc123XYZ', 'abc123XYZ'],
    ['https://youtube.com/watch?v=abc123XYZ&list=PL123&t=30s', 'abc123XYZ'],
    ['https://youtu.be/abc123XYZ', 'abc123XYZ'],
    ['https://youtu.be/abc123XYZ?t=10', 'abc123XYZ'],
    ['https://www.youtube.com/embed/abc123XYZ', 'abc123XYZ'],
    ['https://www.youtube.com/live/abc123XYZ', 'abc123XYZ'],
    ['https://www.youtube-nocookie.com/embed/abc123XYZ', 'abc123XYZ'],
    ['https://m.youtube.com/watch?v=abc123XYZ', 'abc123XYZ'],
  ])('extracts the video id from %s', (url, expected) => {
    expect(extractYouTubeVideoId(url)).toBe(expected);
  });

  it.each(['', '   ', 'not a url at all', 'https://vimeo.com/12345', 'https://example.com/watch?v=abc'])(
    'returns null for %s',
    (url) => {
      expect(extractYouTubeVideoId(url)).toBeNull();
    }
  );
});

describe('youTubeEmbedUrl', () => {
  it('builds a privacy-enhanced embed URL', () => {
    expect(youTubeEmbedUrl('abc123XYZ')).toBe('https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0');
  });
});
