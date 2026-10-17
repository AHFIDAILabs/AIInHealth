# Publishing the Open Access Compendium

The compendium is a set of static JSON files committed to
`frontend/public/compendium/` and a handful of static public pages
(`/compendium`, `/compendium/:code`, `/compendium/authors`,
`/compendium/keywords`, `/compendium/about`) that read them. There is no
backend API involved in serving it — only in producing it.

On by default: the public pages exist in a build as long as
`VITE_COMPENDIUM_ENABLED` isn't explicitly set to `false` at build time
(`frontend/.env` locally, the equivalent env var on Render for a real
deploy). Turn it off before anything has actually been published if you'd
rather the pages not exist yet — with it off, `/compendium/*` falls through
to the ordinary 404 page.

## 1. Get an abstract ready

In the admin dashboard's **Confirmed Abstracts → Compendium** tab, for each
abstract that should appear:

1. Fill in `abstractText`, `authors`, `keywords`, `track`, etc. (the "Edit"
   drawer). These are the exact fields that get published — abstract text is
   never rewritten, summarized, or AI-edited, only whitespace/encoding
   normalized.
2. Record consent (`Record Consent` / `Bulk Record Consent`). This is a
   factual record of how/when the author agreed to publication — not a
   publish action by itself.
3. Move `compendium.publicationStatus` to `ready`, then `published` (or
   `withdrawn`, if it needs to come down after already being published).
   Nothing is ever published without both consent AND an explicit
   `published` status.

## 2. Export a new edition

From `backend/`:

```bash
npx tsx src/scripts/compendium/exportSnapshot.ts          # dry run — preview only, writes nothing
npx tsx src/scripts/compendium/exportSnapshot.ts --apply  # writes the real files
```

`--apply` does three things:

- Writes `frontend/public/compendium/edition.json`, `compendium-<version>.json`,
  `search-index-<version>.json`, and `current.json`.
- Merges onto whatever `edition.json` already has on disk — it never
  clobbers facts a human already filled in (see step 3).
- Stamps `compendium.publishedInVersion` on every exported record in the DB.

The export only includes abstracts with consent recorded AND a status of
`published` or `withdrawn`. A withdrawn record is exported as a bare
`{ code, title, status: "withdrawn" }` tombstone — its text, authors, and
keywords are genuinely removed from the file, not blanked.

## 3. Fill in edition facts (once, by hand)

`edition.json` intentionally ships with several fields as `null` —
`editionTitle`, `publisher`, `doi`, `isbn`, `pdfUrl`, `editors`, `foreword` —
because the export script will never invent them. Edit the file directly
once AHFID confirms these:

```json
{
  "editionTitle": "...",
  "publisher": "...",
  "doi": "...",
  "isbn": "...",
  "pdfUrl": "...",
  "editors": ["..."],
  "foreword": "...",
  "licence": { "name": "CC BY 4.0", "url": "...", "confirmed": true }
}
```

`licence` defaults to CC BY 4.0 with `confirmed: false` — flip it to `true`
once AHFID has actually confirmed that licence (the UI shows a visible
"not yet confirmed" caveat everywhere until then). Re-running the export
script afterwards will not overwrite any of these — only `version` and
`publishedAt` are ever computed fresh.

## 4. Review, commit, deploy

```bash
git status                       # review exactly what changed under frontend/public/compendium/
git add frontend/public/compendium
git commit -m "..."
git push
```

Render redeploys the frontend from the pushed commit. At build time:

1. `vite build` copies `frontend/public/compendium/*` into `dist/compendium/`
   (ordinary Vite static-asset handling).
2. `scripts/generate-sitemap.mjs` + `scripts/prerender.mjs` run (unrelated to
   the compendium — the existing site's own SEO pipeline).
3. `scripts/generate-sitemap-compendium.mjs` reads `dist/compendium/current.json`
   and writes `dist/sitemap-compendium.xml` — one entry per published
   abstract plus the four static compendium pages. Skipped (no error) if the
   feature flag is off or nothing has been exported yet.
4. `scripts/prerender-compendium.mjs` reads the same JSON and writes a
   static, crawler-readable snapshot (title/description/OG/Twitter tags plus
   `ScholarlyArticle` JSON-LD) for each published abstract page and the four
   static pages, onto `dist/app-shell.html`. This is a lighter, string-template
   approach rather than a real browser render (unlike the rest of the site's
   `prerender.mjs`) — deliberate, since the number of abstracts can grow much
   larger than the site's ~20 static routes. Withdrawn abstracts are never
   prerendered or sitemap-listed (nothing left to index).

Both compendium postbuild steps are fail-soft: if anything about them goes
wrong, the main site build still succeeds and simply ships without that one
enhancement for that deploy — see each script's own top-of-file comment.

`robots.txt` references `sitemap-compendium.xml` unconditionally; if the
feature is off or nothing has been exported yet, that one `Sitemap:` line is
just briefly a 404 for crawlers, which they ignore.

## 5. Correcting something after publication

Don't edit the exported JSON files by hand for a content fix. Instead:

1. Fix the record in the admin UI, and add a dated note via `compendium.corrections`
   (each abstract page lists its own correction history).
2. Re-run the export script (`--apply`) to cut a new version. `current.json`'s
   version bump is how every visitor's browser (even one that cached an older
   `compendium-<version>.json`) picks up the change — see `public/sw.js`'s
   comment on why `current.json` itself is always fetched fresh, network-only,
   never cached.
3. Commit and push as in step 4.

## Reference: where everything lives

| What | Where |
|---|---|
| Admin consent/status/editing UI | `frontend/src/pages/admin/confirmedAbstracts/CompendiumTab.tsx` |
| Parser (one-time import from source PDF text) | `backend/src/scripts/compendium/parseAbstracts.ts` |
| DB import (one-time) | `backend/src/scripts/compendium/applyParsed.ts` |
| Export script | `backend/src/scripts/compendium/exportSnapshot.ts` |
| Exported static files | `frontend/public/compendium/*.json` |
| Public pages | `frontend/src/pages/public/compendium/*.tsx` |
| Data-fetching layer | `frontend/src/services/compendium.service.ts` |
| Citation formats (APA/BibTeX/RIS) + JSON-LD | `frontend/src/lib/citation.ts` |
| Render-time sanitizer | `frontend/src/lib/sanitizeAbstractHtml.ts` |
| Sitemap + prerender (compendium-specific) | `frontend/scripts/generate-sitemap-compendium.mjs`, `frontend/scripts/prerender-compendium.mjs` |
