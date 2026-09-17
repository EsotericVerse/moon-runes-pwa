# LOC3 Neon migration

## Scope

This migration moves LOC3 music data into normalized Neon storage without changing Frozen Rune Canon.

Data zones:

- `bronze`: imported source snapshots and lineage only.
- `silver`: normalized works, song versions, semantic annotations, media, and Visibility/Projection governance.
- `vault`: private original text. Full lyrics, author source text, retrieval text, and drafts belong here.
- `gold`: public projections only. Gold views must never read from `vault`.

## Verified source datasets

### Complete private corpus

`Suno_773_政德風創作時間軸與時期分析.xlsx`

Verified from the workbook:

- 773 song rows.
- 773 unique source song IDs.
- 532 creation events / work groups.
- 239 multi-version events.
- 2 songs without lyrics.
- Date range: 2025-02-21 through 2026-08-29.

Primary source sheet: `歌曲時間軸`.

Mapping:

- `事件ID` -> `silver.works.work_id`
- `歌曲ID` -> `silver.song_versions.song_id`
- `歌名` -> work/version title
- `Suno網址` -> `silver.song_versions.suno_url`
- `建立時間台北` / `建立日期` -> created timestamps
- `時期代碼` -> `silver.works.period_code`
- `語言` -> language metadata
- `播放清單` -> version playlist metadata
- `Suno播放次數` / `Suno按讚數` -> version metrics snapshot
- `曲風提示` -> `silver.song_versions.style_prompt`
- `歌詞` -> `vault.work_texts(text_kind='lyrics')`
- MP3 / IG / YouTube fields -> Silver media/version metadata

`創作事件` is an analysis/event-level source and can enrich `silver.works` and later feature tables, but it is not the canonical song-version input.

### Governed public corpus

`Suno_500_公開歌詞作品主資料庫_轉折分析v0.3.1.xlsx`

Verified from the workbook:

- 500 governed public work groups.
- 663 public song versions.
- 110 non-public versions retained for administration only.
- Public-search eligibility is separately governed from publication state.

Primary sheets:

- `500公開作品主表` -> `silver.work_semantics` plus work metadata.
- `663公開版本` -> public source status for song versions.
- `110非公開備查` -> private source status for song versions.
- `語意向量作品索引` -> embedding lineage/status metadata; vectors are not imported by this schema migration.

Semantic mapping:

- `AI摘要` -> `silver.work_semantics.ai_summary`
- `主題標籤` -> `theme_tags`
- `情緒標籤` -> `emotion_tags`
- `意象標籤` -> `imagery_tags`
- `情境標籤` -> `context_tags`
- `曲風分類` -> `genre_tags`
- `歌曲主類別` -> `primary_category`
- `起始狀態` -> `start_state`
- `轉折方式` -> `turn_method`
- `最終狀態` -> `final_state`
- `情緒功能` -> `emotion_function`
- `Embedding文字` -> private `vault.work_texts(text_kind='retrieval_text')`, never Gold

## Visibility / Projection contract

Database governance mirrors the current application contract exactly:

- `visibility`: `private | internal | public`
- `projection_level`: `metadata | summary | full`
- `search_indexed`
- `statistics_included`
- `semantic_scan_included`

Do not add a second `is_public` authority field. `source_publication_status` on song versions records the observed Suno source state; public application access is still decided by `silver.resource_visibility`.

Initial migration policy should be conservative:

1. Every imported resource starts private unless an authoritative public-source row confirms publication.
2. `663公開版本` may become `visibility='public'`; `110非公開備查` remains `private`.
3. Work-level public visibility comes from the governed 500-work dataset, not merely from having a Suno URL.
4. Search/statistics/semantic flags come from governed source fields and must not be inferred from visibility alone.
5. P1/history exclusions remain exclusions even if a source song is publicly reachable.

## Gold privacy invariant

`gold.public_works` and `gold.public_song_versions` do not join `vault`.

`projection_level='full'` means the full **safe projected record**, not full private source text. Lyrics and author text remain private even when a public resource has full projection.

Future public search views should be assembled from governed summaries/tags or separately approved excerpts. They must not expose raw `vault.work_texts.content`.

## Frozen Rune Canon

This LOC3 migration does not create, rewrite, normalize, or backfill Rune Canon tables. Existing Frozen Rune Canon remains read-only and outside the migration scope.

## Migration order

1. Apply schema migration.
2. Import 773 complete song versions and 532 work/event identities into Silver; write lyrics only to Vault.
3. Merge the 500 governed public-work annotations into Silver.
4. Apply 663 public / 110 non-public source publication evidence.
5. Populate `silver.resource_visibility` from governance rules.
6. Validate row counts, uniqueness, missing lyrics, mixed-publication work groups, and P1/search exclusions.
7. Only then point public application reads at Gold projections.
8. Rebuild embeddings after the normalized private corpus is stable.
