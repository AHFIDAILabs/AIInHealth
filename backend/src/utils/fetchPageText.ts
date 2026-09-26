// Deliberately NOT a headless-browser/agentic fetch — per the AI Feature
// Suite's Section 0.4 ("no live agentic web browsing"), this is a plain
// HTTP GET plus a regex-based HTML-to-text strip, exactly the spec's own
// "web_fetch-equivalent" description. No new dependency: Node's global
// fetch (18+) and a handful of regexes are enough for "pull the visible
// text off a government/WHO page for an LLM prompt" — this never renders
// JS, follows no links, and makes exactly one request per call.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 8_000; // keeps the extraction prompt small and cheap

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const decodeEntities = (text: string): string =>
  text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => HTML_ENTITIES[m] ?? m);

export const htmlToText = (html: string): string => {
  const withoutNonVisible = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const withoutTags = withoutNonVisible.replace(/<[^>]+>/g, ' ');
  const decoded = decodeEntities(withoutTags);
  return decoded.replace(/\s+/g, ' ').trim();
};

export class FetchPageTextError extends Error {
  constructor(
    message: string,
    public readonly url: string
  ) {
    super(message);
    this.name = 'FetchPageTextError';
  }
}

export const fetchPageText = async (url: string): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'AIinHealthSummit2026-PolicyTracker/1.0 (+https://aiinhealthsummit.org)' },
    });
  } catch (err) {
    throw new FetchPageTextError(err instanceof Error ? err.message : 'Fetch failed', url);
  }
  if (!response.ok) {
    throw new FetchPageTextError(`HTTP ${response.status}`, url);
  }
  const html = await response.text();
  const text = htmlToText(html);
  if (text.length === 0) {
    throw new FetchPageTextError('Page had no extractable text', url);
  }
  return text.slice(0, MAX_TEXT_LENGTH);
};
