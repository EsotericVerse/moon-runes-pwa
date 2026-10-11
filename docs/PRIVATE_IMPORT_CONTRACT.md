# LOC private archive intake — implementation contract (2026-10-11)

## Product boundary

The website `/private-import/` is a **browser-local acceptance workbench** for X/Twitter and Meta export data. It does not send imported content to Supabase, Neon or the LOC management Import API. The browser uses IndexedDB for draft staging and confirmed derived records; it is not encrypted, is origin-scoped and may be erased with site data. The public web route and public repository are **not authentication/privacy controls**. Do not add any uploaded private archive or chat content to GitHub fixtures.

Deleting a temporary account **does not** delete IndexedDB; use the explicit local purge action. Native Capacitor iOS private file handling remains a separate acceptance gate. Do not create IPA on every parser change.

## Shared, already wired

- ZIP decoding: `fflate`; bounded source size, decompressed volume, entry count, and sequential file handling
- JSON: `@streamparser/json` streaming selected arrays; X YTD `window.YTD.* = [...];` handling is data parsing, not `eval`
- UTF-8: fatal decoding for structured JSON; no silent replacement/transcoding; ordinary text supports UTF-8 and BOM-marked UTF-16; unknown legacy encoding is blocked/reported, not repaired
- Stage parsed rows in IndexedDB by a stable platform/type/source identity; pre-scan for same-record duplicate and conflicting content before confirmation; do not silently overwrite existing items
- Batch writer: sequential IndexedDB transactions, bounded 100/200/500 operations. No remote DB traffic
- Query: local text substring search and per-year counts. Not full-text ranking or large-scale indexed search yet

## Platform adapter categories with synthetic automated fixtures

| Export | Known patterns | Converted kind |
| --- | --- | --- |
| X / Twitter | `data/tweets.js`, YTD tweet or note tweet arrays | post |
| Facebook | `posts/your_posts_1.json`, status_updates arrays | post |
| Facebook Messenger | `messages/inbox/.../message_1.json` with `messages` and `sender_name` | message |
| Instagram | `your_instagram_activity/media/posts_1.json`, `ig_posts` | post |
| Instagram DM | `your_instagram_activity/messages/inbox/.../message_1.json` | message |
| Threads | `threads_posts.json` and common `threads`/post arrays | post |
| Generic JSON | recognized root arrays (`data`, `posts`, `items`, `records`, etc.) and meaningful text/time fields | classified or generic record |
| Generic TXT | readable text with no required extension (8 MiB cap per standalone document) | document |

**This is coverage of common export shapes, not a claim that every Meta archive version, file, comment, reaction, profile detail, HTML export, media binary, or unsupported category is fully normalized.** Unrecognized JSON, non-text media files, and unsupported items must be **counted and surfaced** in the preview; they must never be reported as successfully imported.

## First user acceptance gate (website, *before* new IPA)

1. Select a personally controlled X or Meta ZIP; no archive is sent to ChatGPT, GitHub, an API or a remote database.
2. Verify recognized source files and unsupported files separately, candidate rows, invalid rows, detected character corruption, platform breakdown and raw preview.
3. Review exact preflight NEW / identical / conflicting counts and sequential batch plan.
4. Explicitly confirm before local IndexedDB promotion.
5. Verify browser reload, text search, year counts, re-import idempotency, conflicting records unchanged, then local purge.
6. On a real historical archive, compare source export totals and verify that unsupported categories are not quietly skipped. If content coverage is insufficient, **do not call the complete archive import successful.**
7. Only after website acceptance, design and validate encrypted native SQLite/SQLCipher and Sandbox storage through a separately verified IPA.

## Caveats

- Original ZIP bytes stay in the user's selected source file; the website local DB stores parsed raw JSON objects of recognized entries, not all ZIP attachments or the original ZIP.
- A user may delete browser data at any time; offline local storage is not a permanent backup.
- Meta's exported layouts evolve and can differ by locale or account. Known adapters are maintained as explicit, tested mappings.
- Legacy Big5 or already-mojibake strings require user-approved decoding/repair settings before any normalized record is promoted; never alter original bytes.
