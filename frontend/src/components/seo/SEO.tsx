import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../lib/siteInfo';

const SITE_NAME = 'AI in Health Summit 2026';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  /** Page-specific title only — the site name is appended automatically. */
  title: string;
  description: string;
  /** Root-relative path (e.g. "/agenda") used to build the canonical/OG URL. */
  path: string;
  image?: string;
  /** Marks a transient/error page as non-indexable (payment callback, 404). */
  noindex?: boolean;
  /** One or more schema.org objects, rendered as JSON-LD <script> tags. */
  structuredData?: object | object[];
  /** Homepage-only escape hatch: `title` is already the complete tab title, don't append " | <site name>". */
  titleIsFull?: boolean;
}

// One reusable Helmet wrapper for every public page — see this session's SEO
// plan: before this, every route shared index.html's single static title/
// description/OG tags, so sharing a link to any specific page (or Google
// indexing it) always surfaced the homepage's copy instead of that page's own.
export const SEO = ({ title, description, path, image, noindex, structuredData, titleIsFull }: SEOProps) => {
  const fullTitle = titleIsFull ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const resolvedImage = image ?? DEFAULT_IMAGE;
  const jsonLdBlocks = structuredData ? (Array.isArray(structuredData) ? structuredData : [structuredData]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};
