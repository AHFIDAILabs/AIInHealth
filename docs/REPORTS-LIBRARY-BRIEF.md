# Brief for Claude Code: AIHS 2026 reports library

This is an addition to `AIHS-2027-platform-brief.md`. Read that brief first; all of its working rules apply here (audit first, no fabricated content, checkpoints, separation of concerns).

## What you have

- `pdfs/`: 47 final PDF knowledge products from the 2026 summit, renamed to one pattern: `aihs26-<day>-<venue>-<session>-<docType>.pdf`.
- `reports-manifest.json` (and the same data as `reports-manifest.csv`): one entry per PDF.

These are the official post-summit outputs: session outcomes reports, policy briefs, technical frameworks and reports, digital briefs, white papers, a case study and an investment prospectus. They cover 26 sessions across the Main Hall (Day 1 and Day 2), Breakout Rooms 2 and 3, and the Innovation Showcase. Editable Word versions exist in the owner's OneDrive; the website serves PDFs only.

### Manifest fields

| Field | Meaning |
|---|---|
| `id` | Stable ID, same as the file name without `.pdf`. Use it in URLs. |
| `file` | Path to the PDF in this folder. |
| `sessionId` | Groups the products of one session. 26 sessions. |
| `sessionTitle` | Display title of the session. |
| `docType` / `docTypeLabel` | Machine type and display label (for example `policy-brief` / "Policy Brief"). |
| `venue` | Main Hall, Breakout Room 2, Breakout Room 3, Innovation Showcase. |
| `day` | 1, 2, or `null` if unknown. |
| `dayInferred` | `true` where the day was matched from Flickr album titles, not stated in the folder. The owner must confirm these. |
| `partners` | Partner organisations named in the source folder or file name. |
| `pages`, `sizeMB` | From the PDF. Show both on download buttons (people are on mobile data). |
| `pdfTitle` | Title stored inside the PDF, when present. Several policy briefs carry their own headline, which is a better card title than the session name. |
| `originalPath` | Where the file sat in the source folder, for traceability. |

## Open items for the owner (ask, do not guess)

1. Confirm days where `dayInferred` is `true`, and give the day for the robotics session (`day: null`).
2. The source folder had an empty "Breakout Room 1" folder. Confirm whether Breakout Room 1 reports are still coming; design the library so new reports drop in through the manifest only.
3. Confirm partner names and whether partner logos may be shown.
4. Hosting decision (see below).
5. Whether to add the existing abstract compendium as a related collection on the same page.

## Hosting

Do not commit these PDFs to git or bundle them with the frontend (about 97 MB). Keep the frontend storage-agnostic:

- Each manifest entry resolves to a URL via one helper: `REPORTS_BASE_URL + "/" + fileName`.
- `REPORTS_BASE_URL` is configuration, so the files can move between providers without code changes.
- Options to present to the owner with trade-offs: Cloudinary raw uploads (already in the stack, but downloads count against bandwidth), an object store with free or cheap egress such as Cloudflare R2, or a Render static site used only for files. Recommend one, but let the owner decide.
- Write an upload script that reads the manifest and uploads `pdfs/` to the chosen provider, skipping files already present.

## What to build

Place this in the architecture from the main brief: data in `content/2026/reports.ts` (generated from the manifest), UI in `features/reports/`, pages under `/2026/reports`.

1. **Reports library page** `/2026/reports`
   - Grouped by session, not as a flat list of 47 files. Each session shows its title, venue, day, partners and its documents as clearly labelled download links with type, pages and size.
   - Filters: day, venue, document type, partner. A text search over session titles and PDF titles. Filters reflected in the URL hash so a filtered view can be shared.
   - Mobile first: filters collapse into a single control on small screens.
2. **Session report page** `/2026/reports/<sessionId>`
   - Session title, venue, day, partners, documents, and a link to the matching Flickr album (map `sessionId` to album ID in `content/2026/album-overrides.ts`).
   - Share metadata per page (title, description, image) so WhatsApp and LinkedIn previews work.
3. **Home page section "What came out of it"** (section 8.2 item 2 in the main brief): feature the policy briefs and the summit framing products. Use the PDF titles and short summaries taken from each document's own executive summary or key messages, quoted or closely summarised. Show the owner every summary for approval before it goes live. Do not write summaries from general knowledge.
4. **Cover thumbnails:** a script that renders page 1 of each PDF to a small WebP image (about 400 px wide) and stores it alongside the PDFs on the same host. Cards show the cover with alt text "Cover of <title>".
5. **Analytics:** fire `report_download` with `id`, `docType`, `sessionId` on every download, and `report_view` on session page views.
6. **Links from elsewhere:** agenda archive items, Flickr album views and the compendium link to the matching session report page.

## Quality

- Download links open the PDF directly; label them with file size so people on mobile data can decide.
- Accessible names on every download link ("Download policy brief: Reaching the Last Mile, 5 pages, 1.1 MB"), not "Download".
- If the file host is unreachable, the page still renders and shows a clear message.

## Checkpoint order

1. Report the hosting options with a recommendation. Wait for a decision.
2. Upload script and cover thumbnail script.
3. `content/2026/reports.ts` generation and the reports feature.
4. Library and session pages.
5. Home page section, after the owner approves the summaries.
