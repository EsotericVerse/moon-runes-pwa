CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS gold;

CREATE TABLE silver.works (
  work_id text PRIMARY KEY,
  scope text NOT NULL DEFAULT 'lo3rwang',
  work_type text NOT NULL DEFAULT 'music',
  title text NOT NULL,
  created_at timestamptz,
  created_date date,
  language_label text,
  language_code text,
  period_code text,
  era_code text,
  era_name text,
  content_origin text,
  source_status text NOT NULL DEFAULT 'observed',
  source_ref text,
  source_row integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(scope) <> ''),
  CHECK (btrim(work_id) <> '')
);

CREATE TABLE silver.song_versions (
  song_id text PRIMARY KEY,
  work_id text NOT NULL REFERENCES silver.works(work_id) ON DELETE RESTRICT,
  version_label text,
  source_number integer,
  title text NOT NULL,
  suno_url text,
  source_publication_status text NOT NULL DEFAULT 'unknown'
    CHECK (source_publication_status IN ('public', 'private', 'unknown')),
  is_representative boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  created_date date,
  play_count integer,
  like_count integer,
  style_prompt text,
  playlist text,
  mp3_status text,
  mp3_filename text,
  metadata_updated_at timestamptz,
  source_ref text,
  source_row integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(song_id) <> '')
);

CREATE TABLE vault.work_texts (
  work_id text NOT NULL REFERENCES silver.works(work_id) ON DELETE RESTRICT,
  text_kind text NOT NULL
    CHECK (text_kind IN ('lyrics', 'author_source', 'retrieval_text', 'draft', 'other')),
  language_code text,
  content text NOT NULL CHECK (length(content) > 0),
  content_sha256 text,
  normalized_sha256 text,
  char_count integer,
  line_count integer,
  source_ref text,
  source_row integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (work_id, text_kind)
);

CREATE TABLE silver.work_semantics (
  work_id text PRIMARY KEY REFERENCES silver.works(work_id) ON DELETE RESTRICT,
  ai_summary text,
  theme_tags text[] NOT NULL DEFAULT '{}',
  emotion_tags text[] NOT NULL DEFAULT '{}',
  imagery_tags text[] NOT NULL DEFAULT '{}',
  context_tags text[] NOT NULL DEFAULT '{}',
  genre_tags text[] NOT NULL DEFAULT '{}',
  primary_category text,
  start_state text,
  turn_method text,
  final_state text,
  emotion_function text,
  classification_source text,
  classification_confidence text,
  author_review text,
  embedding_status text,
  embedding_model text,
  embedding_dimensions integer,
  semantic_state text NOT NULL DEFAULT 'observed',
  source_ref text,
  source_row integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE silver.media_assets (
  asset_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL DEFAULT 'lo3rwang',
  resource_type text NOT NULL CHECK (resource_type IN ('work', 'song_version')),
  resource_id text NOT NULL,
  media_type text NOT NULL
    CHECK (media_type IN ('suno', 'instagram_reel', 'instagram_preview', 'youtube_mv', 'mp3', 'other')),
  url text,
  status text,
  note text,
  source_ref text,
  source_row integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE silver.resource_visibility (
  scope text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'internal', 'public')),
  projection_level text NOT NULL DEFAULT 'metadata'
    CHECK (projection_level IN ('metadata', 'summary', 'full')),
  search_indexed boolean NOT NULL DEFAULT false,
  statistics_included boolean NOT NULL DEFAULT false,
  semantic_scan_included boolean NOT NULL DEFAULT false,
  source_ref text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, resource_type, resource_id)
);

CREATE TABLE silver.source_links (
  scope text NOT NULL DEFAULT 'lo3rwang',
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  source_kind text NOT NULL,
  source_ref text NOT NULL,
  source_row integer,
  source_sha256 text,
  source_document_id uuid REFERENCES bronze.json_documents(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, resource_type, resource_id, source_kind, source_ref)
);

CREATE INDEX idx_works_created_date ON silver.works(created_date);
CREATE INDEX idx_works_period ON silver.works(period_code);
CREATE INDEX idx_song_versions_work ON silver.song_versions(work_id);
CREATE INDEX idx_song_versions_publication ON silver.song_versions(source_publication_status);
CREATE INDEX idx_visibility_public
  ON silver.resource_visibility(resource_type, visibility, search_indexed);
CREATE INDEX idx_media_resource ON silver.media_assets(resource_type, resource_id);
CREATE INDEX idx_semantics_theme_tags ON silver.work_semantics USING gin(theme_tags);
CREATE INDEX idx_semantics_emotion_tags ON silver.work_semantics USING gin(emotion_tags);
CREATE INDEX idx_semantics_imagery_tags ON silver.work_semantics USING gin(imagery_tags);

CREATE VIEW gold.public_works AS
SELECT
  w.work_id,
  w.scope,
  w.work_type,
  w.title,
  w.created_at,
  w.created_date,
  w.language_label,
  w.language_code,
  w.period_code,
  w.era_code,
  w.era_name,
  v.projection_level,
  v.search_indexed,
  v.statistics_included,
  v.semantic_scan_included,
  CASE WHEN v.projection_level IN ('summary', 'full') THEN s.ai_summary END AS summary,
  CASE WHEN v.projection_level IN ('summary', 'full') THEN s.theme_tags ELSE '{}'::text[] END AS theme_tags,
  CASE WHEN v.projection_level IN ('summary', 'full') THEN s.emotion_tags ELSE '{}'::text[] END AS emotion_tags,
  CASE WHEN v.projection_level IN ('summary', 'full') THEN s.imagery_tags ELSE '{}'::text[] END AS imagery_tags,
  CASE WHEN v.projection_level IN ('summary', 'full') THEN s.context_tags ELSE '{}'::text[] END AS context_tags,
  CASE WHEN v.projection_level = 'full' THEN s.genre_tags ELSE '{}'::text[] END AS genre_tags,
  CASE WHEN v.projection_level = 'full' THEN s.primary_category END AS primary_category,
  CASE WHEN v.projection_level = 'full' THEN s.start_state END AS start_state,
  CASE WHEN v.projection_level = 'full' THEN s.turn_method END AS turn_method,
  CASE WHEN v.projection_level = 'full' THEN s.final_state END AS final_state,
  CASE WHEN v.projection_level = 'full' THEN s.emotion_function END AS emotion_function
FROM silver.works w
JOIN silver.resource_visibility v
  ON v.scope = w.scope
 AND v.resource_type = 'work'
 AND v.resource_id = w.work_id
LEFT JOIN silver.work_semantics s ON s.work_id = w.work_id
WHERE v.visibility = 'public';

CREATE VIEW gold.public_song_versions AS
SELECT
  sv.song_id,
  sv.work_id,
  sv.version_label,
  sv.source_number,
  sv.title,
  sv.suno_url,
  sv.is_representative,
  sv.created_at,
  sv.created_date,
  sv.play_count,
  sv.like_count,
  CASE WHEN v.projection_level = 'full' THEN sv.style_prompt END AS style_prompt,
  sv.playlist,
  v.projection_level,
  v.search_indexed,
  v.statistics_included,
  v.semantic_scan_included
FROM silver.song_versions sv
JOIN silver.works w ON w.work_id = sv.work_id
JOIN silver.resource_visibility v
  ON v.scope = w.scope
 AND v.resource_type = 'song_version'
 AND v.resource_id = sv.song_id
WHERE v.visibility = 'public';
