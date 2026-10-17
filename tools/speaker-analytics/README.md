# Speaker Analytics — "Who's Speaking" graphic

One-off analytics graphic for a pre-event email, showing the calibre and
range of confirmed speakers at the AI in Health Nigeria Summit 2026. Fully
self-contained — its own `package.json`, its own dependencies, no connection
to Mongo or any other live service when it runs. It reads one CSV file and
writes PNGs + HTML/text snippets to `out/`.

## Re-running this when the speaker list changes

```
# 1. Pull the latest speaker data (this is the one step that touches the DB —
#    run from backend/, not from this folder)
cd ../../backend
npx tsx src/scripts/exportSpeakersForAnalytics.ts

# 2. Review the categorization
cd ../tools/speaker-analytics
npm run categorize
```

`npm run categorize` writes `data/speaker_categories.csv`. Open it and check:
- Any row whose `notes` column says **"NEEDS REVIEW"** — a speaker new since
  the last pass, with no sector/seniority assigned yet. Add them to
  `src/categories.ts`'s `CATEGORY_BY_ID` lookup (see the existing entries for
  the shape), then re-run `npm run categorize`.
- Anyone who should no longer appear (e.g. withdrew from the event) — add
  their speaker id to `src/categories.ts`'s `EXCLUDED_IDS` with a reason.
- A speaker with the literal title "Details pending" and no organisation is
  automatically excluded (an incomplete profile, not a real category) — no
  action needed unless their real details have since been filled in on the
  Speaker record, in which case just re-run step 1.

Once the CSV looks right:

```
npm run render
```

This writes to `out/`:
- `speaker-analytics.png` — 600px, the actual email display size.
- `speaker-analytics@2x.png` — 1200px, for retina.
- `email-snippet.html` — a table-based, inline-styled snippet to paste into
  the email. Replace `[IMAGE_URL]` with the final hosted image URL.
- `alt-text.txt` — the same descriptive summary used as the image's alt text.
- `preview.html` — open this directly in a browser to sanity-check the
  design without needing to view the PNG.

It also prints every computed count to the terminal so you can check it
against the image before sending anything.

## Known data-quality flag

Two speakers' `organisation` fields currently record "World Health
Organisation" and "World Health Organization (WHO) Nigeria" — the same real
organisation, inconsistent spelling. Not merged automatically (that would
silently change a computed number); fix at the source
(`Speaker.organization` on the relevant record) if you want them counted as
one.

## Why a DB-reading script lives in `backend/` instead of here

This tool's own dependencies are deliberately DB-free — it only ever reads
`data/speakers.csv`, nothing else, so it can't accidentally touch a live
service. `backend/src/scripts/exportSpeakersForAnalytics.ts` is the one
place real data gets pulled from; it's a new file (no existing file was
modified) that reuses the backend's already-present dependencies rather than
adding mongoose/DB-connection logic into this isolated package.

## Safety notes

- `email` is read from the CSV and dropped immediately on load
  (`src/loadSpeakers.ts`) — never written to any output file or logged.
- Every number in the graphic is computed directly from
  `data/speaker_categories.csv` (see `src/computeStats.ts`) — nothing is
  invented, estimated, or hardcoded.
- This folder has no dependency on, and makes no change to, `Backend/` or
  `Frontend/`.
