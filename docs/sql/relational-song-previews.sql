-- The plural JSON field is empty and unused; keep the active scalar ig_preview_url.
alter table silver.song_versions drop column ig_preview_urls;
