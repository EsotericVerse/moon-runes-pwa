-- Generated from the current PostgreSQL catalog; application data is not included.

-- Restore existing RLS only; silver/api remain private Data API schemas.

CREATE SCHEMA silver;

CREATE SCHEMA api;

DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anonymous') THEN CREATE ROLE anonymous NOLOGIN; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;

REVOKE ALL ON SCHEMA silver,api FROM PUBLIC;

CREATE FUNCTION api.request_claims() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;

CREATE FUNCTION api.current_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(api.request_claims()->>'sub','') $$;

CREATE TABLE "api"."user_records" (
  "owner_id" text DEFAULT api.current_user_id() NOT NULL,
  "id" text NOT NULL,
  "record_type" text NOT NULL,
  "record_kind" text,
  "source" text,
  "record_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "scope_id" text,
  "mode" text,
  "mode_label" text,
  "moon_phase" text,
  "trend" text,
  "result" text,
  "guidance" text,
  "daily_role" text,
  "card_numbers" integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
  "card_names" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "card_positions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "card_directions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "card_attributes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "card_states" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "positive_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "negative_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  CONSTRAINT "user_records_pkey" PRIMARY KEY (owner_id, id)
);

CREATE TABLE "api"."user_settings" (
  "owner_id" text DEFAULT api.current_user_id() NOT NULL,
  "setting_key" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "text_value" text,
  "integer_value" integer,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY (owner_id, setting_key)
);

CREATE TABLE "silver"."VisualNovel" (
  "vn_key" text NOT NULL,
  "work_key" text NOT NULL,
  "record_type" text NOT NULL,
  "parent_key" text,
  "target_key" text,
  "relation_type" text,
  "part_no" smallint,
  "chapter_no" smallint,
  "scene_no" smallint,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "title" text,
  "summary" text,
  "content" text,
  "text_value" text,
  "number_value" numeric,
  "bool_value" boolean,
  "speaker_key" text,
  "pov_key" text,
  "canon_status" text DEFAULT 'working'::text NOT NULL,
  "status" text DEFAULT 'current'::text NOT NULL,
  "reveal_stage" text,
  "not_before_part" smallint,
  "not_after_part" smallint,
  "is_locked" boolean DEFAULT false NOT NULL,
  "is_current" boolean DEFAULT true NOT NULL,
  "source_kind" text,
  "source_ref" text,
  "source_url" text,
  "source_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "VisualNovel_pkey" PRIMARY KEY (vn_key),
  CONSTRAINT "visual_novel_chapter_range" CHECK (chapter_no IS NULL OR chapter_no >= 0 AND chapter_no <= 999),
  CONSTRAINT "visual_novel_key_not_blank" CHECK (btrim(vn_key) <> ''::text),
  CONSTRAINT "visual_novel_part_range" CHECK (part_no IS NULL OR part_no >= 1 AND part_no <= 99),
  CONSTRAINT "visual_novel_part_window" CHECK (not_before_part IS NULL OR not_after_part IS NULL OR not_before_part <= not_after_part),
  CONSTRAINT "visual_novel_scene_range" CHECK (scene_no IS NULL OR scene_no >= 0 AND scene_no <= 999),
  CONSTRAINT "visual_novel_type_not_blank" CHECK (btrim(record_type) <> ''::text),
  CONSTRAINT "visual_novel_work_not_blank" CHECK (btrim(work_key) <> ''::text)
);

CREATE TABLE "silver"."database_targets" (
  "target_id" text NOT NULL,
  "provider" text NOT NULL,
  "label" text NOT NULL,
  "project_id" text,
  "project_url" text NOT NULL,
  "selected" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "engine" text DEFAULT 'postgres'::text NOT NULL,
  "connection_alias" text,
  "connection_mode" text DEFAULT 'direct'::text NOT NULL,
  CONSTRAINT "database_targets_pkey" PRIMARY KEY (target_id),
  CONSTRAINT "database_targets_provider_check" CHECK (provider = ANY (ARRAY['supabase'::text, 'neon'::text, 'custom'::text])),
  CONSTRAINT "database_targets_engine_check" CHECK (engine = ANY (ARRAY['postgres'::text, 'mysql'::text, 'mssql'::text, 'sqlite'::text])),
  CONSTRAINT "database_targets_provider_engine_check" CHECK (provider = 'custom'::text OR engine = 'postgres'::text),
  CONSTRAINT "database_targets_mode_check" CHECK (connection_mode = ANY (ARRAY['direct'::text, 'pooler'::text])),
  CONSTRAINT "database_targets_alias_check" CHECK (connection_alias IS NULL OR connection_alias ~ '^[a-z][a-z0-9_]{0,63}
);

CREATE TABLE "silver"."email_blocklist" (
  "email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_blocklist_format" CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text),
  CONSTRAINT "email_blocklist_normalized" CHECK (email = lower(btrim(email))),
  CONSTRAINT "email_blocklist_pkey" PRIMARY KEY (email)
);

CREATE TABLE "silver"."game" (
  "game_key" text NOT NULL,
  "record_type" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'current'::text NOT NULL,
  "is_current" boolean DEFAULT true NOT NULL,
  "event_id" text,
  "event_group" text,
  "event_title" text,
  "event_requirement" text,
  "event_description" text,
  "rune_id" integer,
  "rune_name" text,
  "rune_group" text,
  "rune_action_text" text,
  "rune_action_kind" text,
  "rune_action_value" integer,
  "role_id" integer,
  "role_formal_name" text,
  "role_public_name" text,
  "role_group" text,
  "role_core_function" text,
  "role_intervention_type" text,
  "role_intervention_name" text,
  "role_tool" text,
  "role_tagline" text,
  "rule_code" text,
  "rule_title" text,
  "rule_text" text,
  "macro_code" text,
  "macro_group_a" text,
  "macro_group_b" text,
  "macro_title" text,
  "macro_description" text,
  "asset_code" text,
  "asset_kind" text,
  "asset_group" text,
  "asset_path" text,
  "asset_title" text,
  "source_note" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rule_round_no" integer,
  "rule_phase" text,
  "rule_result_code" text,
  "rule_de_delta" integer,
  "rule_draw_count" integer,
  "rule_value_int" integer,
  "rule_value_text" text,
  "asset_group_2" text,
  "event_group_2" text,
  CONSTRAINT "game_check" CHECK (record_type = 'event'::text AND event_id IS NOT NULL OR record_type = 'rune_action'::text AND rune_id IS NOT NULL OR record_type = 'role'::text AND role_id IS NOT NULL OR record_type = 'rule'::text AND rule_code IS NOT NULL OR record_type = 'macro'::text AND macro_code IS NOT NULL OR record_type = 'asset'::text AND asset_code IS NOT NULL),
  CONSTRAINT "game_pkey" PRIMARY KEY (game_key),
  CONSTRAINT "game_record_type_check" CHECK (record_type = ANY (ARRAY['event'::text, 'rune_action'::text, 'role'::text, 'rule'::text, 'macro'::text, 'asset'::text])),
  CONSTRAINT "game_status_check" CHECK (status = ANY (ARRAY['current'::text, 'alpha'::text, 'historical'::text]))
);

CREATE TABLE "silver"."keyword_classes" (
  "class_id" uuid NOT NULL,
  "scope_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "keyword_classes_pkey" PRIMARY KEY (class_id)
);

CREATE TABLE "silver"."lo3rwang" (
  "id" text NOT NULL,
  "email" text,
  "period" text,
  "period_start" date,
  "period_end" date,
  "style" integer,
  "theme" text DEFAULT 'theme-7'::text NOT NULL,
  "search_able" boolean DEFAULT true NOT NULL,
  "statistics_able" boolean DEFAULT true NOT NULL,
  "culture_able" boolean DEFAULT true NOT NULL,
  "sources" text[] DEFAULT ARRAY['facebook'::text, 'threads'::text, 'ig'::text, 'x'::text, 'others'::text] NOT NULL,
  "source_counts" jsonb DEFAULT '{"x": 0, "ig": 0, "others": 0, "threads": 0, "facebook": 0}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "media_count" integer DEFAULT 0 NOT NULL,
  "media_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "keyword_min_chars" integer DEFAULT 32 NOT NULL,
  "keyword_min_documents" integer DEFAULT 100 NOT NULL,
  "staticstime" timestamp with time zone,
  "current_keyword_class_id" uuid,
  "keyword_class_share_enabled" boolean DEFAULT false NOT NULL,
  "keyword_document_count" integer DEFAULT 0 NOT NULL,
  "keyword_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_name" text NOT NULL,
  "search_intro" text DEFAULT ''::text NOT NULL,
  "search_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "locale" text DEFAULT 'zh-Hant'::text NOT NULL,
  CONSTRAINT "lo3rwang_keyword_document_count_check" CHECK (keyword_document_count >= 0),
  CONSTRAINT "lo3rwang_keyword_min_chars_check" CHECK (keyword_min_chars >= 0 AND keyword_min_chars <= 10000),
  CONSTRAINT "lo3rwang_keyword_min_documents_check" CHECK (keyword_min_documents >= 0 AND keyword_min_documents <= 1000000),
  CONSTRAINT "lo3rwang_locale_check" CHECK (locale = ANY (ARRAY['zh-Hant'::text, 'zh-Hans'::text, 'en'::text])),
  CONSTRAINT "lo3rwang_pkey" PRIMARY KEY (id)
);

CREATE TABLE "silver"."lo3rwang_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "lo3rwang_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "lo3rwang_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "lo3rwang_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lo3rwang_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lo3rwang_galaxy" (
  "uid" character(8) NOT NULL,
  "title" text,
  "content" text,
  "createtime" timestamp with time zone,
  "source_native_id" text,
  "source_place" text,
  "searchable" boolean DEFAULT true NOT NULL,
  "UpdateTime" timestamp with time zone DEFAULT now() NOT NULL,
  "url" text,
  "source_id" character(8),
  "target_id" text[],
  "ref_id" character(8),
  "source_name" text,
  "media_link" uuid[],
  "statistics_able" boolean DEFAULT true NOT NULL,
  "class_id" smallint,
  "group_lists" jsonb DEFAULT 'false'::jsonb NOT NULL,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_class_id_check" CHECK (class_id IS NULL OR class_id >= 1 AND class_id <= 8),
  CONSTRAINT "lo3rwang_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lo3rwang_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
  CONSTRAINT "lo3rwang_galaxy_group_lists_shape_check" CHECK (group_lists = 'false'::jsonb OR jsonb_typeof(group_lists) = 'object'::text),
  CONSTRAINT "lo3rwang_galaxy_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lo3rwang_galaxy_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lo3rwang_galaxy_media" (
  "media_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "galaxy_link" character(8),
  "source_native_id" text,
  "media_type" text NOT NULL,
  "title" text,
  "url" text,
  "meta_tags" text,
  "createtime" timestamp with time zone,
  "source_place" text,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_media_pkey" PRIMARY KEY (media_id)
);

CREATE TABLE "silver"."lo3rwang_keywords" (
  "keyword_id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "group_name" text NOT NULL,
  "item_no" integer NOT NULL,
  "item_name" text NOT NULL,
  "principle" text DEFAULT ''::text NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "order_no" integer DEFAULT 0 NOT NULL,
  "class_name" text NOT NULL,
  "class_group" text NOT NULL,
  "class_enable" boolean DEFAULT true NOT NULL,
  "class_id" uuid NOT NULL,
  CONSTRAINT "lo3rwang_keywords_array_check" CHECK (jsonb_typeof(keywords) = 'array'::text),
  CONSTRAINT "lo3rwang_keywords_class_group_nonempty" CHECK (length(btrim(class_group)) > 0),
  CONSTRAINT "lo3rwang_keywords_class_name_nonempty" CHECK (length(btrim(class_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_group_nonempty" CHECK (length(btrim(group_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_item_no_positive" CHECK (item_no > 0),
  CONSTRAINT "lo3rwang_keywords_item_nonempty" CHECK (length(btrim(item_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_pkey" PRIMARY KEY (keyword_id)
);

CREATE TABLE "silver"."lo3rwang_time" (
  "record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "record_type" text NOT NULL,
  "resource_id" text,
  "label" text,
  "display_order" integer,
  "status" text,
  "note" text,
  "time_date" date,
  "anchor_ids" text[],
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "style_description" text,
  CONSTRAINT "lo3rwang_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lo3rwang_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text, 'style_comment'::text])),
  CONSTRAINT "lo3rwang_time_record_type_resource_id_key" UNIQUE (record_type, resource_id),
  CONSTRAINT "lo3rwang_time_style_comment_shape_check" CHECK (record_type <> 'style_comment'::text OR NULLIF(btrim(label), ''::text) IS NOT NULL AND NULLIF(btrim(style_description), ''::text) IS NOT NULL AND (status = 'needs_anchor'::text AND anchor_ids IS NULL OR status IS DISTINCT FROM 'needs_anchor'::text AND COALESCE(cardinality(anchor_ids), 0) = 1 AND NULLIF(btrim(COALESCE(anchor_ids[1], ''::text)), ''::text) IS NOT NULL AND COALESCE(anchor_ids[1], '0'::text) <> '0'::text))
);

CREATE TABLE "silver"."loc_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "loc_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "loc_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "loc_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "loc_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."loc_search_keywords" (
  "search_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "searched_at" timestamp with time zone DEFAULT now() NOT NULL,
  "scope_id" text NOT NULL,
  "query_text" text NOT NULL,
  CONSTRAINT "loc_search_keywords_pkey" PRIMARY KEY (search_id),
  CONSTRAINT "loc_search_keywords_query_text_check" CHECK (btrim(query_text) <> ''::text AND char_length(query_text) <= 200),
  CONSTRAINT "loc_search_keywords_scope_id_check" CHECK (scope_id ~ '^[a-z][a-z0-9]{0,31}$'::text)
);

CREATE TABLE "silver"."loc_theme" (
  "theme_id" smallint NOT NULL,
  "theme_name" text NOT NULL,
  "theme_order" integer NOT NULL,
  "scheme" text NOT NULL,
  "style_key" text NOT NULL,
  "identity_color" text NOT NULL,
  "loc_bg" text NOT NULL,
  "loc_panel" text NOT NULL,
  "loc_panel_2" text NOT NULL,
  "loc_panel_strong" text NOT NULL,
  "loc_panel_nav" text NOT NULL,
  "loc_panel_tab" text NOT NULL,
  "loc_rune_bg" text NOT NULL,
  "loc_rune_selected_bg" text NOT NULL,
  "loc_line" text NOT NULL,
  "loc_line_soft" text NOT NULL,
  "loc_line_softer" text NOT NULL,
  "loc_line_faint" text NOT NULL,
  "loc_text" text NOT NULL,
  "loc_muted" text NOT NULL,
  "loc_heading" text NOT NULL,
  "loc_accent" text NOT NULL,
  "loc_gold" text NOT NULL,
  "loc_danger" text NOT NULL,
  "loc_surface" text NOT NULL,
  "loc_surface_soft" text NOT NULL,
  "loc_surface_faint" text NOT NULL,
  "loc_surface_status" text NOT NULL,
  "loc_accent_surface" text NOT NULL,
  "loc_accent_surface_strong" text NOT NULL,
  "loc_accent_border" text NOT NULL,
  "loc_accent_border_soft" text NOT NULL,
  "loc_accent_border_faint" text NOT NULL,
  "loc_gold_surface" text NOT NULL,
  "loc_gold_surface_soft" text NOT NULL,
  "loc_gold_border" text NOT NULL,
  "loc_gold_border_soft" text NOT NULL,
  "loc_gold_border_faint" text NOT NULL,
  "loc_gold_ring" text NOT NULL,
  "loc_gold_ring_soft" text NOT NULL,
  "loc_danger_border" text NOT NULL,
  "loc_primary_start" text NOT NULL,
  "loc_primary_end" text NOT NULL,
  "loc_body_glow" text NOT NULL,
  "loc_body_mid" text NOT NULL,
  "loc_hero_start" text NOT NULL,
  "loc_hero_end" text NOT NULL,
  "loc_shadow" text NOT NULL,
  "loc_shadow_card" text NOT NULL,
  CONSTRAINT "loc_theme_id_check" CHECK (theme_id >= 1 AND theme_id <= 8),
  CONSTRAINT "loc_theme_order_check" CHECK (theme_order >= 1 AND theme_order <= 8),
  CONSTRAINT "loc_theme_pkey" PRIMARY KEY (theme_id),
  CONSTRAINT "loc_theme_scheme_check" CHECK (scheme = ANY (ARRAY['light'::text, 'dark'::text]))
);

CREATE TABLE "silver"."lrunes" (
  "id" text NOT NULL,
  "email" text,
  "period" text,
  "period_start" date,
  "period_end" date,
  "style" integer,
  "theme" text DEFAULT 'theme-7'::text NOT NULL,
  "search_able" boolean DEFAULT true NOT NULL,
  "statistics_able" boolean DEFAULT true NOT NULL,
  "culture_able" boolean DEFAULT true NOT NULL,
  "sources" text[] DEFAULT ARRAY['facebook'::text, 'threads'::text, 'ig'::text, 'x'::text, 'others'::text] NOT NULL,
  "source_counts" jsonb DEFAULT '{"x": 0, "ig": 0, "others": 0, "threads": 0, "facebook": 0}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "media_count" integer DEFAULT 0 NOT NULL,
  "media_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_name" text NOT NULL,
  "search_intro" text DEFAULT ''::text NOT NULL,
  "search_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "locale" text DEFAULT 'zh-Hant'::text NOT NULL,
  CONSTRAINT "lrunes_locale_check" CHECK (locale = ANY (ARRAY['zh-Hant'::text, 'zh-Hans'::text, 'en'::text])),
  CONSTRAINT "lrunes_pkey" PRIMARY KEY (id)
);

CREATE TABLE "silver"."lrunes_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "lrunes_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "lrunes_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "lrunes_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lrunes_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lrunes_daily" (
  "record_id" text NOT NULL,
  "record_date" date NOT NULL,
  "draw_kind" text NOT NULL,
  "rune_number" integer NOT NULL,
  "direction" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "recorded_phase" text,
  CONSTRAINT "lrunes_daily_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_daily_record_date_draw_kind_key" UNIQUE (record_date, draw_kind),
  CONSTRAINT "lrunes_daily_rune_number_check" CHECK (rune_number >= 0 AND rune_number <= 66)
);

CREATE TABLE "silver"."lrunes_galaxy" (
  "uid" character(8) NOT NULL,
  "title" text,
  "content" text,
  "createtime" timestamp with time zone,
  "source_native_id" text,
  "source_place" text,
  "searchable" boolean DEFAULT true NOT NULL,
  "UpdateTime" timestamp with time zone DEFAULT now() NOT NULL,
  "url" text,
  "source_id" character(8),
  "target_id" text[],
  "ref_id" character(8),
  "source_name" text,
  "media_link" uuid[],
  "statistics_able" boolean DEFAULT true NOT NULL,
  "class_id" smallint,
  "group_lists" jsonb DEFAULT 'false'::jsonb NOT NULL,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text),
  CONSTRAINT "lrunes_galaxy_class_id_check" CHECK (class_id IS NULL OR class_id >= 1 AND class_id <= 8),
  CONSTRAINT "lrunes_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lrunes_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
  CONSTRAINT "lrunes_galaxy_group_lists_shape_check" CHECK (group_lists = 'false'::jsonb OR jsonb_typeof(group_lists) = 'object'::text),
  CONSTRAINT "lrunes_galaxy_pkey" PRIMARY KEY (uid)
);

CREATE TABLE "silver"."lrunes_galaxy_media" (
  "media_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "galaxy_link" character(8),
  "source_native_id" text,
  "media_type" text NOT NULL,
  "title" text,
  "url" text,
  "meta_tags" text,
  "createtime" timestamp with time zone,
  "source_place" text,
  "content_blocks" jsonb,
  CONSTRAINT "lrunes_galaxy_media_pkey" PRIMARY KEY (media_id)
);

CREATE TABLE "silver"."lrunes_time" (
  "record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "record_type" text NOT NULL,
  "resource_id" text,
  "label" text,
  "display_order" integer,
  "status" text,
  "note" text,
  "time_date" date,
  "anchor_ids" text[],
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "style_description" text,
  CONSTRAINT "lrunes_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text, 'style_comment'::text])),
  CONSTRAINT "lrunes_time_record_type_resource_id_key" UNIQUE (record_type, resource_id),
  CONSTRAINT "lrunes_time_style_comment_shape_check" CHECK (record_type <> 'style_comment'::text OR NULLIF(btrim(label), ''::text) IS NOT NULL AND NULLIF(btrim(style_description), ''::text) IS NOT NULL AND (status = 'needs_anchor'::text AND anchor_ids IS NULL OR status IS DISTINCT FROM 'needs_anchor'::text AND COALESCE(cardinality(anchor_ids), 0) = 1 AND NULLIF(btrim(COALESCE(anchor_ids[1], ''::text)), ''::text) IS NOT NULL AND COALESCE(anchor_ids[1], '0'::text) <> '0'::text))
);

CREATE TABLE "silver"."manage" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "galaxy" text,
  "time" text,
  "birthday" date,
  "Title_TW" text,
  "Desc_TW" text,
  CONSTRAINT "manage_pkey" PRIMARY KEY (id, email),
  CONSTRAINT "manage_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'scope'::text]))
);

CREATE TABLE "silver"."runes" (
  "rune_id" smallint NOT NULL,
  "rune_name" character varying(1),
  "english_name" character varying(12),
  "totem" character varying(2),
  "group_name" character varying(12),
  "moon_phase" smallint,
  "card_attr" smallint,
  "rune_description" character varying(40),
  "archetype" character varying(10),
  "char_action" character varying(60),
  "positive_keywords" text,
  "negative_keywords" text,
  "extra_rules" text,
  "extra_notes" text,
  "positive_meaning" character varying(40),
  "half_positive_meaning" character varying(40),
  "half_reverse_meaning" character varying(40),
  "reverse_meaning" character varying(40),
  "rune_evolution_history" character varying(32),
  "myth_story" character varying(48),
  "soul_question" character varying(16),
  "practice_challenge" character varying(20),
  "ritual_advice" character varying(28),
  "harmony_advice" character varying(32),
  "class_enable" boolean DEFAULT true NOT NULL,
  CONSTRAINT "runes_card_attr_check" CHECK (card_attr >= 1 AND card_attr <= 4),
  CONSTRAINT "runes_moon_phase_check" CHECK (moon_phase >= 1 AND moon_phase <= 4),
  CONSTRAINT "runes_pkey" PRIMARY KEY (rune_id),
  CONSTRAINT "runes_rune_id_check" CHECK (rune_id >= 0 AND rune_id <= 66)
);

CREATE TABLE "silver"."runes_etc" (
  "rune_id" smallint NOT NULL,
  "dir" smallint NOT NULL,
  "type" character varying(10) NOT NULL,
  "desc" character varying(80) NOT NULL,
  "current_moon" character varying DEFAULT ''::character varying NOT NULL,
  CONSTRAINT "runes_etc_current_moon_check" CHECK (current_moon::text = ANY (ARRAY[''::character varying::text, '新月'::character varying::text, '上弦'::character varying::text, '滿月'::character varying::text, '下弦'::character varying::text, '空亡'::character varying::text])),
  CONSTRAINT "runes_etc_dir_check" CHECK (dir >= 1 AND dir <= 4),
  CONSTRAINT "runes_etc_pkey" PRIMARY KEY (rune_id, dir, type, current_moon),
  CONSTRAINT "runes_etc_rune_id_check" CHECK (rune_id >= 0 AND rune_id <= 66)
);

CREATE TABLE "silver"."runes_group" (
  "group_id" character varying(2) NOT NULL,
  "english_name" character varying(10) NOT NULL,
  "desc" character varying(40) NOT NULL,
  "quality" character varying(10) NOT NULL,
  "style" character varying(24) NOT NULL,
  "runeslist" smallint[] NOT NULL,
  CONSTRAINT "runes_group_pkey" PRIMARY KEY (group_id)
);

CREATE TABLE "silver"."scope_group_source_sharing" (
  "scope_id" text NOT NULL,
  "category_code" text NOT NULL,
  "share_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_group_source_sharing_pkey" PRIMARY KEY (scope_id, category_code)
);

CREATE TABLE "silver"."scope_other_sources" (
  "scope_id" text NOT NULL,
  "source_key" text NOT NULL,
  "display_name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_other_sources_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "scope_other_sources_pkey" PRIMARY KEY (scope_id, source_key),
  CONSTRAINT "scope_other_sources_source_key_check" CHECK (char_length(btrim(source_key)) >= 1 AND char_length(btrim(source_key)) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."scope_registry" (
  "scope_id" text NOT NULL,
  "display_name" text NOT NULL,
  "scope_kind" text DEFAULT 'scope'::text NOT NULL,
  "domain" text,
  "directory" text,
  "parent_scope_id" text,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "extra_sign" text,
  CONSTRAINT "scope_registry_canonical_route_check" CHECK ((domain IS NULL) <> (directory IS NULL) AND
CASE
    WHEN scope_id = 'loc'::text THEN domain = 'loc.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'admin'::text THEN domain = 'admin.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'lrunes'::text THEN domain = 'lrunes.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'lo3rwang'::text THEN domain IS NULL AND directory = '/lo3rwang'::text
    ELSE domain IS NOT NULL AND domain = (scope_id || '.lo3rwang.cc'::text) AND directory IS NULL OR directory IS NOT NULL AND directory = ('/'::text || scope_id) AND domain IS NULL
END),
  CONSTRAINT "scope_registry_id_check" CHECK (scope_id ~ '^[a-z][a-z0-9]{0,14}$'::text),
  CONSTRAINT "scope_registry_kind_check" CHECK (scope_kind = ANY (ARRAY['scope'::text, 'group'::text, 'system'::text])),
  CONSTRAINT "scope_registry_name_check" CHECK (btrim(display_name) <> ''::text),
  CONSTRAINT "scope_registry_no_repeated_domain_labels" CHECK (domain IS NULL OR NOT silver.domain_has_repeated_labels(domain)),
  CONSTRAINT "scope_registry_pkey" PRIMARY KEY (scope_id),
  CONSTRAINT "scope_registry_route_check" CHECK (domain IS NOT NULL AND btrim(domain) <> ''::text AND (directory IS NULL OR btrim(directory) = ''::text) OR directory IS NOT NULL AND btrim(directory) <> ''::text AND (domain IS NULL OR btrim(domain) = ''::text))
);

CREATE TABLE "silver"."scope_source_subcategories" (
  "scope_id" text NOT NULL,
  "source_key" text NOT NULL,
  "category_code" text NOT NULL,
  "display_name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_source_subcategories_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "scope_source_subcategories_pkey" PRIMARY KEY (scope_id, source_key),
  CONSTRAINT "scope_source_subcategories_source_key_check" CHECK (length(source_key) >= 1 AND length(source_key) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."statistics_source_aliases" (
  "source_key" text NOT NULL,
  "category_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "statistics_source_aliases_pkey" PRIMARY KEY (source_key),
  CONSTRAINT "statistics_source_aliases_source_key_check" CHECK (char_length(btrim(source_key)) >= 1 AND char_length(btrim(source_key)) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."statistics_source_categories" (
  "category_code" text NOT NULL,
  "display_name" text NOT NULL,
  "sort_order" integer DEFAULT 100 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "statistics_source_categories_category_code_check" CHECK (category_code ~ '^[a-z][a-z0-9_-]{0,63}$'::text),
  CONSTRAINT "statistics_source_categories_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "statistics_source_categories_pkey" PRIMARY KEY (category_code)
);

ALTER TABLE "silver"."lo3rwang" ADD CONSTRAINT "lo3rwang_current_keyword_class_fk" FOREIGN KEY (current_keyword_class_id) REFERENCES silver.keyword_classes(class_id);

ALTER TABLE "silver"."lo3rwang_galaxy_media" ADD CONSTRAINT "lo3rwang_galaxy_media_galaxy_link_fkey" FOREIGN KEY (galaxy_link) REFERENCES silver.lo3rwang_galaxy(uid) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "silver"."lo3rwang_keywords" ADD CONSTRAINT "lo3rwang_keywords_class_fk" FOREIGN KEY (class_id) REFERENCES silver.keyword_classes(class_id);

ALTER TABLE "silver"."scope_group_source_sharing" ADD CONSTRAINT "scope_group_source_sharing_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "silver"."scope_group_source_sharing" ADD CONSTRAINT "scope_group_source_sharing_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."scope_other_sources" ADD CONSTRAINT "scope_other_sources_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."scope_registry" ADD CONSTRAINT "scope_registry_parent_fk" FOREIGN KEY (parent_scope_id) REFERENCES silver.scope_registry(scope_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "silver"."scope_source_subcategories" ADD CONSTRAINT "scope_source_subcategories_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code);

ALTER TABLE "silver"."scope_source_subcategories" ADD CONSTRAINT "scope_source_subcategories_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."statistics_source_aliases" ADD CONSTRAINT "statistics_source_aliases_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code);

CREATE INDEX visual_novel_canon_idx ON silver."VisualNovel" USING btree (work_key, canon_status, is_current);

CREATE INDEX visual_novel_parent_idx ON silver."VisualNovel" USING btree (work_key, parent_key, sort_order);

CREATE INDEX visual_novel_reveal_idx ON silver."VisualNovel" USING btree (work_key, reveal_stage, part_no) WHERE (reveal_stage IS NOT NULL);

CREATE INDEX visual_novel_target_idx ON silver."VisualNovel" USING btree (work_key, target_key) WHERE (target_key IS NOT NULL);

CREATE INDEX visual_novel_work_type_idx ON silver."VisualNovel" USING btree (work_key, record_type, part_no, chapter_no, scene_no, sort_order);

CREATE UNIQUE INDEX database_targets_one_selected ON silver.database_targets USING btree (selected) WHERE selected;

CREATE UNIQUE INDEX game_asset_code_unique ON silver.game USING btree (asset_code) WHERE (record_type = 'asset'::text);

CREATE INDEX game_asset_kind_idx ON silver.game USING btree (asset_kind, sort_order) WHERE (record_type = 'asset'::text);

CREATE INDEX game_event_group_idx ON silver.game USING btree (event_group, sort_order) WHERE (record_type = 'event'::text);

CREATE UNIQUE INDEX game_event_id_unique ON silver.game USING btree (event_id) WHERE (record_type = 'event'::text);

CREATE UNIQUE INDEX game_macro_code_unique ON silver.game USING btree (macro_code) WHERE (record_type = 'macro'::text);

CREATE INDEX game_record_type_idx ON silver.game USING btree (record_type, sort_order);

CREATE INDEX game_role_group_idx ON silver.game USING btree (role_group) WHERE (record_type = 'role'::text);

CREATE UNIQUE INDEX game_role_id_unique ON silver.game USING btree (role_id) WHERE (record_type = 'role'::text);

CREATE UNIQUE INDEX game_rune_action_id_unique ON silver.game USING btree (rune_id) WHERE (record_type = 'rune_action'::text);

CREATE INDEX game_rune_id_idx ON silver.game USING btree (rune_id) WHERE (record_type = 'rune_action'::text);

CREATE INDEX lo3rwang_blocks_page_order_idx ON silver.lo3rwang_blocks USING btree (page_name, block_order);

CREATE INDEX idx_lo3rwang_galaxy_createtime ON silver.lo3rwang_galaxy USING btree (createtime);

CREATE INDEX idx_lo3rwang_galaxy_ref_id ON silver.lo3rwang_galaxy USING btree (ref_id) WHERE (ref_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_id ON silver.lo3rwang_galaxy USING btree (source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_name ON silver.lo3rwang_galaxy USING btree (source_name) WHERE (source_name IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_native ON silver.lo3rwang_galaxy USING btree (source_name, source_native_id) WHERE ((source_name IS NOT NULL) AND (source_native_id IS NOT NULL));

CREATE INDEX idx_lo3rwang_galaxy_statistics_time_source ON silver.lo3rwang_galaxy USING btree (createtime) INCLUDE (source_name) WHERE ((statistics_able = true) AND (content <> ''::text));

CREATE INDEX idx_lo3rwang_galaxy_target_id ON silver.lo3rwang_galaxy USING btree (target_id) WHERE (target_id IS NOT NULL);

CREATE UNIQUE INDEX lo3rwang_galaxy_uid_ci_uq ON silver.lo3rwang_galaxy USING btree (lower((uid)::text));

CREATE INDEX idx_lo3rwang_galaxy_media_createtime ON silver.lo3rwang_galaxy_media USING btree (createtime);

CREATE INDEX lo3rwang_galaxy_media_link_idx ON silver.lo3rwang_galaxy_media USING btree (galaxy_link);

CREATE UNIQUE INDEX lo3rwang_galaxy_media_url_uidx ON silver.lo3rwang_galaxy_media USING btree (url) WHERE (url IS NOT NULL);

CREATE INDEX lo3rwang_keywords_class_group_order_idx ON silver.lo3rwang_keywords USING btree (class_name, class_group, order_no, item_no);

CREATE INDEX lo3rwang_keywords_class_id_idx ON silver.lo3rwang_keywords USING btree (class_id, order_no, item_no);

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_name_idx ON silver.lo3rwang_keywords USING btree (class_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_no_idx ON silver.lo3rwang_keywords USING btree (class_name, item_no);

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_name_idx ON silver.lo3rwang_keywords USING btree (group_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_no_idx ON silver.lo3rwang_keywords USING btree (group_name, item_no);

CREATE INDEX lo3rwang_keywords_order_idx ON silver.lo3rwang_keywords USING btree (group_name, order_no, item_no);

CREATE INDEX lo3rwang_time_date_idx ON silver.lo3rwang_time USING btree (time_date);

CREATE INDEX lo3rwang_time_order_idx ON silver.lo3rwang_time USING btree (record_type, display_order);

CREATE INDEX lo3rwang_time_style_comment_lookup_idx ON silver.lo3rwang_time USING btree (record_type, label);

CREATE INDEX loc_blocks_page_order_idx ON silver.loc_blocks USING btree (page_name, block_order);

CREATE INDEX loc_search_keywords_scope_time_idx ON silver.loc_search_keywords USING btree (scope_id, searched_at DESC);

CREATE INDEX loc_search_keywords_searched_at_idx ON silver.loc_search_keywords USING btree (searched_at DESC);

CREATE INDEX lrunes_blocks_page_order_idx ON silver.lrunes_blocks USING btree (page_name, block_order);

CREATE INDEX idx_lrunes_galaxy_statistics_time_source ON silver.lrunes_galaxy USING btree (createtime) INCLUDE (source_name) WHERE ((statistics_able = true) AND (content <> ''::text));

CREATE INDEX lrunes_galaxy_createtime_idx ON silver.lrunes_galaxy USING btree (createtime);

CREATE UNIQUE INDEX lrunes_galaxy_lower_idx ON silver.lrunes_galaxy USING btree (lower((uid)::text));

CREATE INDEX lrunes_galaxy_ref_id_idx ON silver.lrunes_galaxy USING btree (ref_id) WHERE (ref_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_source_id_idx ON silver.lrunes_galaxy USING btree (source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_source_name_idx ON silver.lrunes_galaxy USING btree (source_name) WHERE (source_name IS NOT NULL);

CREATE INDEX lrunes_galaxy_target_id_idx ON silver.lrunes_galaxy USING btree (target_id) WHERE (target_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_media_create_time_idx ON silver.lrunes_galaxy_media USING btree (createtime);

CREATE INDEX lrunes_galaxy_media_galaxy_link_idx ON silver.lrunes_galaxy_media USING btree (galaxy_link);

CREATE UNIQUE INDEX lrunes_galaxy_media_url_idx ON silver.lrunes_galaxy_media USING btree (url) WHERE (url IS NOT NULL);

CREATE INDEX lrunes_time_date_idx ON silver.lrunes_time USING btree (time_date);

CREATE INDEX lrunes_time_order_idx ON silver.lrunes_time USING btree (record_type, display_order);

CREATE INDEX lrunes_time_style_comment_lookup_idx ON silver.lrunes_time USING btree (record_type, label);

CREATE INDEX manage_email_lower_idx ON silver.manage USING btree (lower(email));

CREATE INDEX scope_other_sources_scope_idx ON silver.scope_other_sources USING btree (scope_id);

CREATE UNIQUE INDEX scope_registry_directory_unique ON silver.scope_registry USING btree (lower(directory)) WHERE ((directory IS NOT NULL) AND (btrim(directory) <> ''::text));

CREATE UNIQUE INDEX scope_registry_domain_unique ON silver.scope_registry USING btree (lower(domain)) WHERE ((domain IS NOT NULL) AND (btrim(domain) <> ''::text));

CREATE UNIQUE INDEX scope_registry_extra_sign_unique ON silver.scope_registry USING btree (extra_sign) WHERE (extra_sign IS NOT NULL);

CREATE INDEX scope_registry_parent_idx ON silver.scope_registry USING btree (parent_scope_id) WHERE (parent_scope_id IS NOT NULL);

CREATE UNIQUE INDEX scope_registry_unique_directory ON silver.scope_registry USING btree (lower(directory)) WHERE (directory IS NOT NULL);

CREATE UNIQUE INDEX scope_registry_unique_domain ON silver.scope_registry USING btree (lower(domain)) WHERE (domain IS NOT NULL);

CREATE INDEX scope_source_subcategories_parent_idx ON silver.scope_source_subcategories USING btree (category_code);

CREATE OR REPLACE FUNCTION silver.current_auth_email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
 SELECT lower(coalesce(api.request_claims()->>'email',''))
$function$
;

CREATE OR REPLACE FUNCTION silver.can_manage_global()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email() AND role='admin'
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.can_manage_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email()
    AND (role='admin' OR (role='scope' AND id=p_scope_id))
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.domain_has_repeated_labels(p_domain text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM unnest(string_to_array(lower(p_domain),'.')) label
    GROUP BY label HAVING count(*)>1
  );
$function$
;

CREATE OR REPLACE FUNCTION silver.registered_scope_extra_sign(p_scope_id text, p_scope_kind text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_owner_email text;
begin
  select lower(btrim(email)) into v_owner_email
    from silver.manage
   where id='lo3rwang' and role='admin'
   order by email limit 1;
  if coalesce(v_owner_email,'')='' then return null; end if;

  -- LOC is the canonical root Group. It has no separate manage/email row;
  -- the personal owner identity is established by the Author admin mapping.
  if p_scope_id='loc' and p_scope_kind='group' then return 'codex'; end if;

  -- Author/LunaRunes must belong to that exact registered owner at creation.
  if p_scope_kind='scope' and p_scope_id in ('lo3rwang','lrunes') and exists(
    select 1 from silver.manage m
     where m.id=p_scope_id
       and lower(btrim(m.email))=v_owner_email
       and m.role in ('admin','scope')
  ) then
    return case p_scope_id
      when 'lo3rwang' then 'anchor'
      when 'lrunes' then 'moon'
      else null
    end;
  end if;
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.management_write(p_table text, p_operation text, p_rows jsonb DEFAULT NULL::jsonb, p_values jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
declare
 v_rel regclass;
 v_allowed boolean := false;
 v_row jsonb;
 v_columns text;
 v_values_expr text;
 v_set_expr text;
 v_where text := '';
 v_filter jsonb;
 v_filter_col text;
 v_count integer := 0;
 v_affected integer := 0;
 v_scope_rows integer := 0;
 v_scope_id text := '';
 v_email text := '';
 v_scope record;
begin
 if coalesce(trim(p_table),'')='' then raise exception 'table is required'; end if;
 v_rel := to_regclass(p_table);
 if v_rel is null then raise exception 'unknown relation'; end if;

 if v_rel = 'silver.manage'::regclass then
   v_allowed := silver.can_manage_global();
 elsif v_rel = 'silver.loc_blocks'::regclass then
   v_allowed := silver.can_manage_global();
 else
   for v_scope in
     select distinct id,coalesce(nullif(galaxy,''),'galaxy') as galaxy,coalesce(nullif(time,''),'time') as time
     from silver.manage
   loop
     if not silver.can_manage_scope(v_scope.id) then continue; end if;
     if v_rel = to_regclass(format('silver.%I',v_scope.id))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy||'_media'))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.time))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_blocks'))
     then
       v_allowed := true;
       exit;
     end if;
   end loop;
 end if;

 if not v_allowed then raise exception 'management permission denied'; end if;

 if p_operation='scope_sync' then
   if v_rel <> 'silver.manage'::regclass then raise exception 'scope_sync only supports silver.manage'; end if;
   if jsonb_typeof(p_values) <> 'object' then raise exception 'values must be an object'; end if;
   if jsonb_typeof(p_filters) <> 'array' then raise exception 'filters must be an array'; end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if v_filter->>'column'='id' then v_scope_id:=coalesce(v_filter->>'value',''); end if;
     if v_filter->>'column'='email' then v_email:=coalesce(v_filter->>'value',''); end if;
   end loop;
   if v_scope_id='' or v_email='' then raise exception 'scope_sync requires id and email'; end if;
   if not exists(select 1 from silver.manage where id=v_scope_id and lower(email)=lower(v_email)) then raise exception 'mapping row not found'; end if;
   update silver.manage
   set role=case when lower(email)=lower(v_email) and p_values ? 'role' then coalesce(nullif(p_values->>'role',''),role) else role end,
       galaxy=case when p_values ? 'galaxy' then coalesce(nullif(p_values->>'galaxy',''),galaxy) else galaxy end,
       time=case when p_values ? 'time' then coalesce(nullif(p_values->>'time',''),time) else time end,
       birthday=case when p_values ? 'birthday' then nullif(p_values->>'birthday','')::date else birthday end
   where id=v_scope_id;
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);

 elsif p_operation='insert' then
   if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be an array'; end if;
   if jsonb_array_length(p_rows)=0 then return jsonb_build_object('count',0); end if;
   for v_row in select value from jsonb_array_elements(p_rows) loop
     select string_agg(quote_ident(k.key),',' order by k.key),
            string_agg(format('((jsonb_populate_record(NULL::%s,$1)).%I)',v_rel::text,k.key),',' order by k.key)
     into v_columns,v_values_expr
     from jsonb_object_keys(v_row) as k(key)
     join pg_attribute a on a.attrelid=v_rel and a.attname=k.key and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='';
     if coalesce(v_columns,'')='' then raise exception 'no writable columns'; end if;
     execute format('insert into %s (%s) values (%s)',v_rel::text,v_columns,v_values_expr) using v_row;
     v_count := v_count + 1;
   end loop;
   return jsonb_build_object('count',v_count);

 elsif p_operation='update' then
   if jsonb_typeof(p_values) <> 'object' then raise exception 'values must be an object'; end if;
   if jsonb_typeof(p_filters) <> 'array' or jsonb_array_length(p_filters)=0 then raise exception 'filters are required'; end if;
   if exists (
     select 1 from jsonb_object_keys(p_values) k(key)
     join pg_index i on i.indrelid=v_rel and i.indisprimary
     join pg_attribute a on a.attrelid=v_rel and a.attnum = any(i.indkey)
     where a.attname=k.key
   ) then raise exception 'primary key update is not allowed'; end if;
   select string_agg(format('%I=((jsonb_populate_record(NULL::%s,$1)).%I)',k.key,v_rel::text,k.key),',' order by k.key)
   into v_set_expr
   from jsonb_object_keys(p_values) as k(key)
   join pg_attribute a on a.attrelid=v_rel and a.attname=k.key and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='';
   if coalesce(v_set_expr,'')='' then raise exception 'no writable columns'; end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if coalesce(v_filter->>'operator','eq') <> 'eq' then raise exception 'only eq filters are supported'; end if;
     v_filter_col := v_filter->>'column';
     if not exists(select 1 from pg_attribute where attrelid=v_rel and attname=v_filter_col and attnum>0 and not attisdropped) then raise exception 'invalid filter column'; end if;
     if v_where<>'' then v_where := v_where||' and '; end if;
     v_where := v_where||format('%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
       v_filter_col,v_rel::text,jsonb_build_object(v_filter_col,v_filter->'value')::text,v_filter_col);
   end loop;
   execute format('update %s set %s where %s',v_rel::text,v_set_expr,v_where) using p_values;
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);

 elsif p_operation='delete' then
   if jsonb_typeof(p_filters) <> 'array' or jsonb_array_length(p_filters)=0 then raise exception 'filters are required'; end if;
   if v_rel='silver.manage'::regclass then
     for v_filter in select value from jsonb_array_elements(p_filters) loop
       if v_filter->>'column'='id' then v_scope_id:=coalesce(v_filter->>'value',''); end if;
       if v_filter->>'column'='email' then v_email:=coalesce(v_filter->>'value',''); end if;
     end loop;
     if v_scope_id<>'' and v_email<>'' and exists(select 1 from silver.manage where id=v_scope_id and lower(email)=lower(v_email)) then
       select count(*) into v_scope_rows from silver.manage where id=v_scope_id;
       if v_scope_rows<=1 then raise exception 'cannot remove the final Scope registry row'; end if;
     end if;
   end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if coalesce(v_filter->>'operator','eq') <> 'eq' then raise exception 'only eq filters are supported'; end if;
     v_filter_col := v_filter->>'column';
     if not exists(select 1 from pg_attribute where attrelid=v_rel and attname=v_filter_col and attnum>0 and not attisdropped) then raise exception 'invalid filter column'; end if;
     if v_where<>'' then v_where := v_where||' and '; end if;
     v_where := v_where||format('%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
       v_filter_col,v_rel::text,jsonb_build_object(v_filter_col,v_filter->'value')::text,v_filter_col);
   end loop;
   execute format('delete from %s where %s',v_rel::text,v_where);
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);
 else
   raise exception 'unsupported operation';
 end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_mode text := lower(coalesce(p_rows->>'mode',''));
  v_rows jsonb := p_rows->'rows';
  v_meta jsonb := coalesce(p_rows->'meta','{}'::jsonb);
  v_config regclass;
  v_galaxy regclass;
  v_galaxy_suffix text;
  v_affected integer := 0;
  v_document_count integer := 0;
  v_expected integer := 0;
  v_meta_class_id text := '';
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  select coalesce(nullif(galaxy,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope order by case when role='admin' then 0 else 1 end,email limit 1;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    -- PostgreSQL safe-update requires a WHERE clause. Avoid touching already cleared rows.
    execute format('update %s set class_id=null,group_lists=''false''::jsonb where class_id is not null or group_lists is distinct from ''false''::jsonb',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_document_count=0,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select upper(btrim(x.uid))::character(8) as uid,x.class_id,coalesce(x.group_lists,''{}''::jsonb) as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists jsonb)
         where btrim(coalesce(x.uid,'''')) <> ''''
       )
       update %s as g set class_id=p.class_id,group_lists=p.group_lists from payload p where g.uid=p.uid',
      v_galaxy
    ) using v_rows;
    get diagnostics v_affected = row_count;
    if v_affected<>v_expected then raise exception 'keyword classification chunk incomplete: expected %, affected %',v_expected,v_affected; end if;
    return v_affected;
  end if;

  if v_mode='finalize' then
    v_meta_class_id := coalesce(v_meta->>'class_id','');
    if v_meta_class_id='' then raise exception 'classification metadata class_id is required'; end if;
    execute format('select count(*) from %s where id=$1 and current_keyword_class_id::text=$2',v_config)
      into v_expected using v_scope,v_meta_class_id;
    if v_expected<>1 then raise exception 'current keyword Class changed before finalize'; end if;
    execute format('select count(*) from %s where group_lists<>''false''::jsonb',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_document_count=$2,keyword_meta=$3,updated_at=now() where id=$1',v_config)
      using v_scope,v_document_count,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$
;

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_rows jsonb)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select api.apply_keyword_classification('lo3rwang',p_rows)
$function$
;

CREATE OR REPLACE FUNCTION api.copy_rune66_keyword_class(p_scope_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_source_class uuid;
  v_copy_id uuid := gen_random_uuid();
  v_class_name text;
  v_target regclass;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.scope_registry WHERE scope_id=v_scope AND scope_kind='scope')
    THEN RAISE EXCEPTION 'Scope does not exist'; END IF;
  v_target := to_regclass(format('silver.%I',v_scope||'_keywords'));
  IF v_target IS NULL THEN RAISE EXCEPTION 'Scope keyword table does not exist'; END IF;
  SELECT current_keyword_class_id INTO v_source_class FROM silver.lo3rwang WHERE id='lo3rwang';
  IF v_source_class IS NULL THEN RAISE EXCEPTION 'Source Rune66 Class is not configured'; END IF;
  SELECT count(*) INTO v_count FROM silver.lo3rwang_keywords WHERE class_id=v_source_class;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy requires exactly 66 source entries; got %',v_count; END IF;

  v_class_name := '符文66副本-'||replace(v_copy_id::text,'-','');
  INSERT INTO silver.keyword_classes(class_id,scope_id) VALUES(v_copy_id,v_scope);
  EXECUTE format(
    'INSERT INTO %s(class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
     SELECT $1,$2,item_no,item_name,principle,keywords,order_no,$2,class_group,class_enable
     FROM silver.lo3rwang_keywords WHERE class_id=$3 ORDER BY order_no,item_no',
    v_target
  ) USING v_copy_id,v_class_name,v_source_class;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy wrote % instead of 66 entries',v_count; END IF;
  RETURN jsonb_build_object('class_id',v_copy_id,'class_name',v_class_name,'count',v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.delete_scope(p_scope_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_kind text;
  v_suffix text;
  v_relation text;
BEGIN
  IF NOT silver.can_manage_global() THEN RAISE EXCEPTION 'Global Admin permission required'; END IF;
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF v_scope IN ('loc','lrunes','lo3rwang','admin') THEN RAISE EXCEPTION 'Cannot delete a built-in Scope'; END IF;
  SELECT scope_kind INTO v_kind FROM silver.scope_registry WHERE scope_id=v_scope FOR UPDATE;
  IF NOT FOUND OR v_kind<>'scope' THEN RAISE EXCEPTION 'Only an existing non-system Scope may be deleted'; END IF;
  IF EXISTS(SELECT 1 FROM silver.scope_registry WHERE parent_scope_id=v_scope)
    THEN RAISE EXCEPTION 'Scope has child Registry entries'; END IF;
  FOREACH v_suffix IN ARRAY ARRAY['_galaxy_media','_galaxy','_time','_keywords','_blocks',''] LOOP
    v_relation := format('silver.%I',v_scope||v_suffix);
    IF to_regclass(v_relation) IS NULL THEN RAISE EXCEPTION 'Expected Scope table % is missing',v_relation; END IF;
    EXECUTE 'DROP TABLE '||v_relation||' RESTRICT';
  END LOOP;
  DELETE FROM silver.keyword_classes WHERE scope_id=v_scope;
  DELETE FROM silver.manage WHERE id=v_scope;
  DELETE FROM silver.scope_registry WHERE scope_id=v_scope;
  RETURN jsonb_build_object('scope_id',v_scope,'deleted',true);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.log_search_keyword(p_scope_id text, p_query_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_query text := btrim(coalesce(p_query_text,''));
begin
  if v_query = '' then
    return;
  end if;

  if char_length(v_query) > 200 then
    v_query := left(v_query,200);
  end if;

  if v_scope <> 'loc' and not exists (
    select 1 from silver.manage where id = v_scope
  ) then
    return;
  end if;

  delete from silver.loc_search_keywords
  where searched_at < now() - interval '7 days';

  insert into silver.loc_search_keywords(scope_id,query_text)
  values (v_scope,v_query);
end;
$function$
;

CREATE OR REPLACE FUNCTION api.manage_scope_registry(p_operation text, p_scope_id text, p_values jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operation text := lower(btrim(coalesce(p_operation,'')));
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_values jsonb := coalesce(p_values,'{}'::jsonb);
  v_current silver.scope_registry%rowtype;
  v_name text;
  v_domain text;
  v_directory text;
  v_parent text;
  v_active boolean;
  v_sort integer;
  v_cycle boolean := false;
begin
  if not silver.can_manage_global() then
    raise exception 'global management permission denied';
  end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then
    raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter';
  end if;
  if jsonb_typeof(v_values) <> 'object' then
    raise exception 'values must be an object';
  end if;

  if v_operation='create_group' then
    if exists(select 1 from silver.scope_registry where scope_id=v_scope) then
      raise exception 'Scope registry ID already exists';
    end if;

    v_name := btrim(coalesce(v_values->>'display_name',''));
    v_domain := lower(btrim(coalesce(v_values->>'domain','')));
    v_directory := lower(btrim(coalesce(v_values->>'directory','')));
    v_parent := lower(btrim(coalesce(v_values->>'parent_scope_id','loc')));
    v_active := coalesce((v_values->>'active')::boolean,true);

    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then
      raise exception 'exactly one of domain or directory is required';
    end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then
      raise exception 'domain format is invalid';
    end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then
        raise exception 'directory format is invalid';
      end if;
    end if;
    if not exists(
      select 1 from silver.scope_registry
      where scope_id=v_parent and scope_kind='group' and active
    ) then
      raise exception 'parent Scope Group does not exist or is inactive';
    end if;
    if v_values ? 'sort_order' then
      v_sort := coalesce((v_values->>'sort_order')::integer,0);
    else
      select coalesce(max(sort_order),0)+10 into v_sort
      from silver.scope_registry where parent_scope_id=v_parent;
    end if;

    insert into silver.scope_registry(
      scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order
    ) values(
      v_scope,v_name,'group',nullif(v_domain,''),nullif(v_directory,''),v_parent,v_active,v_sort
    )
    returning * into v_current;

  elsif v_operation='update' then
    select * into v_current from silver.scope_registry where scope_id=v_scope;
    if not found then raise exception 'Scope registry row not found'; end if;
    if v_current.scope_kind='system' then
      raise exception 'system registry rows are immutable';
    end if;

    v_name := case when v_values ? 'display_name'
      then btrim(coalesce(v_values->>'display_name',''))
      else v_current.display_name end;
    v_domain := case when v_values ? 'domain'
      then lower(btrim(coalesce(v_values->>'domain','')))
      else coalesce(v_current.domain,'') end;
    v_directory := case when v_values ? 'directory'
      then lower(btrim(coalesce(v_values->>'directory','')))
      else coalesce(v_current.directory,'') end;
    v_parent := case when v_values ? 'parent_scope_id'
      then lower(btrim(coalesce(v_values->>'parent_scope_id','')))
      else coalesce(v_current.parent_scope_id,'') end;
    v_active := case when v_values ? 'active'
      then coalesce((v_values->>'active')::boolean,false)
      else v_current.active end;
    v_sort := case when v_values ? 'sort_order'
      then coalesce((v_values->>'sort_order')::integer,0)
      else v_current.sort_order end;

    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then
      raise exception 'exactly one of domain or directory is required';
    end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then
      raise exception 'domain format is invalid';
    end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then
        raise exception 'directory format is invalid';
      end if;
    end if;

    if v_scope='loc' then
      if v_parent<>'' then raise exception 'root LOC group cannot have a parent'; end if;
      if not v_active then raise exception 'root LOC group cannot be disabled'; end if;
    else
      if v_parent='' then raise exception 'non-root registry rows require a parent Scope Group'; end if;
      if v_parent=v_scope then raise exception 'Scope cannot parent itself'; end if;
      if not exists(
        select 1 from silver.scope_registry
        where scope_id=v_parent and scope_kind='group' and active
      ) then
        raise exception 'parent Scope Group does not exist or is inactive';
      end if;
    end if;

    if v_current.scope_kind='group' and v_parent<>'' then
      with recursive ancestors(scope_id,parent_scope_id) as (
        select r.scope_id,r.parent_scope_id
        from silver.scope_registry r where r.scope_id=v_parent
        union all
        select r.scope_id,r.parent_scope_id
        from silver.scope_registry r
        join ancestors a on r.scope_id=a.parent_scope_id
        where a.parent_scope_id is not null
      )
      select exists(select 1 from ancestors where scope_id=v_scope) into v_cycle;
      if v_cycle then raise exception 'Scope Group parent would create a cycle'; end if;
    end if;

    if v_current.scope_kind='group' and not v_active and exists(
      select 1 from silver.scope_registry where parent_scope_id=v_scope and active
    ) then
      raise exception 'move or disable active child Scopes before disabling this Group';
    end if;

    update silver.scope_registry
    set display_name=v_name,
        domain=nullif(v_domain,''),
        directory=nullif(v_directory,''),
        parent_scope_id=nullif(v_parent,''),
        active=v_active,
        sort_order=v_sort,
        updated_at=now()
    where scope_id=v_scope
    returning * into v_current;
  else
    raise exception 'unsupported Scope Registry operation';
  end if;

  return jsonb_build_object(
    'scope_id',v_current.scope_id,
    'display_name',v_current.display_name,
    'scope_kind',v_current.scope_kind,
    'domain',v_current.domain,
    'directory',v_current.directory,
    'parent_scope_id',v_current.parent_scope_id,
    'active',v_current.active,
    'sort_order',v_current.sort_order
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION api.move_scope_block(p_scope_id text, p_page_name text, p_uid text, p_direction integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_page text := lower(btrim(coalesce(p_page_name,'')));
  v_uid text := btrim(coalesce(p_uid,''));
  v_table regclass;
  v_order integer;
  v_neighbor_uid text;
  v_neighbor_order integer;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope ID'; END IF;
  IF v_page='' OR length(v_page)>80 THEN RAISE EXCEPTION 'Invalid page name'; END IF;
  IF v_uid !~ '^[A-Za-z0-9]{8}$' THEN RAISE EXCEPTION 'Invalid block UID'; END IF;
  IF p_direction NOT IN (-1,1) OR p_direction IS NULL THEN RAISE EXCEPTION 'Direction must be -1 or 1'; END IF;
  IF NOT (
    CASE WHEN v_scope='loc' THEN silver.can_manage_global()
    ELSE silver.can_manage_scope(v_scope) END
  ) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  v_table := to_regclass(format('silver.%I',v_scope||'_blocks'));
  IF v_table IS NULL THEN RAISE EXCEPTION 'Scope Blocks table not found'; END IF;
  -- Serialise swaps of any two blocks on the same page.
  PERFORM pg_advisory_xact_lock(hashtext(v_scope),hashtext(v_page));
  EXECUTE format('SELECT block_order FROM %s WHERE uid=$1 AND page_name=$2',v_table)
    INTO v_order USING v_uid,v_page;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Block not found on requested page'; END IF;
  IF p_direction=-1 THEN
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order<$2 ORDER BY block_order DESC,uid DESC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  ELSE
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order>$2 ORDER BY block_order ASC,uid ASC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  END IF;
  IF v_neighbor_uid IS NULL THEN RAISE EXCEPTION 'Block is already at page boundary'; END IF;
  EXECUTE format('UPDATE %s SET block_order=CASE WHEN uid=$1 THEN $3 ELSE $4 END
                  WHERE page_name=$5 AND uid IN ($1,$2)',v_table)
    USING v_uid,v_neighbor_uid,v_neighbor_order,v_order,v_page;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>2 THEN RAISE EXCEPTION 'Block reorder incomplete: % rows',v_count; END IF;
  RETURN jsonb_build_object('uid',v_uid,'block_order',v_neighbor_order,'neighbor_uid',v_neighbor_uid,'neighbor_order',v_order);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.provision_scope(p_scope_id text, p_display_name text, p_email text, p_birthday date DEFAULT NULL::date, p_domain text DEFAULT NULL::text, p_directory text DEFAULT NULL::text, p_parent_scope_id text DEFAULT 'loc'::text, p_theme text DEFAULT 'system-default'::text, p_copy_keywords boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_name text := btrim(coalesce(p_display_name,''));
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_directory text := lower(btrim(coalesce(p_directory,'')));
  v_parent text := lower(btrim(coalesce(p_parent_scope_id,'loc')));
  v_theme text := lower(btrim(coalesce(p_theme,'system-default')));
  v_config_name text;
  v_galaxy_name text;
  v_media_name text;
  v_time_name text;
  v_keywords_name text;
  v_blocks_name text;
  v_source_class uuid;
  v_new_class uuid;
  v_keyword_count integer := 0;
  v_keyword_sequence text;
  v_sort_order integer := 0;
begin
  if not silver.can_manage_global() then raise exception 'global management permission denied'; end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter'; end if;
  if v_name='' then raise exception 'display name is required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email format is invalid'; end if;
  if v_theme<>'system-default' and v_theme !~ '^theme-[1-8]$' then raise exception 'theme must be theme-1 through theme-8'; end if;
  if (v_domain='') = (v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
  if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
  if v_directory<>'' then
    v_directory := '/'||btrim(v_directory,'/');
    if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
  end if;
  if v_parent='' then v_parent := 'loc'; end if;
  if not exists(select 1 from silver.scope_registry where scope_id=v_parent and scope_kind='group' and active)
  then raise exception 'parent Scope Group does not exist or is inactive'; end if;
  if exists(select 1 from silver.scope_registry where scope_id=v_scope) or exists(select 1 from silver.manage where id=v_scope)
  then raise exception 'Scope already exists'; end if;
  if v_domain<>'' and exists(select 1 from silver.scope_registry where lower(domain)=v_domain)
  then raise exception 'domain already belongs to another Scope'; end if;
  if v_directory<>'' and exists(select 1 from silver.scope_registry where lower(directory)=v_directory)
  then raise exception 'directory already belongs to another Scope'; end if;

  v_config_name := v_scope;
  v_galaxy_name := v_scope||'_galaxy';
  v_media_name := v_scope||'_galaxy_media';
  v_time_name := v_scope||'_time';
  v_keywords_name := v_scope||'_keywords';
  v_blocks_name := v_scope||'_blocks';

  if to_regclass(format('silver.%I',v_config_name)) is not null
    or to_regclass(format('silver.%I',v_galaxy_name)) is not null
    or to_regclass(format('silver.%I',v_media_name)) is not null
    or to_regclass(format('silver.%I',v_time_name)) is not null
    or to_regclass(format('silver.%I',v_keywords_name)) is not null
    or to_regclass(format('silver.%I',v_blocks_name)) is not null
  then raise exception 'one or more Scope relations already exist'; end if;

  execute format('create table silver.%I (like silver.lo3rwang including all)',v_config_name);
  execute format('create trigger sync_scope_display_name after insert or update of display_name on silver.%I for each row execute function silver.sync_scope_config_display_name()',v_config_name);
  execute format('alter table silver.%I drop column if exists home_blocks',v_config_name);
  execute format('alter table silver.%I drop column if exists governance_blocks',v_config_name);
  -- Canonical source of truth: do not repeat a separate Blocks schema here.
  -- LIKE INCLUDING ALL copies fields, UID defaults, validation and page/order indexes.
  execute format('create table silver.%I (like silver.lo3rwang_blocks including all)',v_blocks_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy including all)',v_galaxy_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy_media including all)',v_media_name);
  execute format('create table silver.%I (like silver.lo3rwang_time including all)',v_time_name);
  execute format('create table silver.%I (like silver.lo3rwang_keywords including all)',v_keywords_name);

  execute format('alter table silver.%I add constraint %I foreign key (galaxy_link) references silver.%I(uid)',v_media_name,v_scope||'_galaxy_media_galaxy_link_fk',v_galaxy_name);
  execute format('alter table silver.%I add constraint %I foreign key (current_keyword_class_id) references silver.keyword_classes(class_id)',v_config_name,v_scope||'_current_keyword_class_fk');
  execute format('alter table silver.%I add constraint %I foreign key (class_id) references silver.keyword_classes(class_id)',v_keywords_name,v_scope||'_keywords_class_fk');

  execute format('alter table silver.%I enable row level security',v_config_name);
  execute format('alter table silver.%I enable row level security',v_galaxy_name);
  execute format('alter table silver.%I enable row level security',v_media_name);
  execute format('alter table silver.%I enable row level security',v_time_name);
  execute format('alter table silver.%I enable row level security',v_keywords_name);
  execute format('alter table silver.%I enable row level security',v_blocks_name);

  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_config_public_read',v_config_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_config_scope_update',v_config_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_galaxy_public_read',v_galaxy_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_galaxy_scope_update',v_galaxy_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_media_public_read',v_media_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_media_scope_update',v_media_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_time_public_read',v_time_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_time_scope_all',v_time_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_keywords_scope_all',v_keywords_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_blocks_public_read',v_blocks_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_blocks_scope_all',v_blocks_name,v_scope,v_scope);

  execute format('grant select on silver.%I to anonymous,authenticated',v_config_name);
  execute format('grant update on silver.%I to authenticated',v_config_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_galaxy_name);
  execute format('grant update on silver.%I to authenticated',v_galaxy_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_media_name);
  execute format('grant update on silver.%I to authenticated',v_media_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_time_name);
  execute format('grant select,insert,update,delete on silver.%I to authenticated',v_keywords_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_blocks_name);
  execute format('grant insert,update,delete on silver.%I to authenticated',v_blocks_name);
  v_keyword_sequence := pg_get_serial_sequence(format('silver.%I',v_keywords_name),'keyword_id');
  if v_keyword_sequence is not null then execute format('grant usage,select on sequence %s to authenticated',v_keyword_sequence); end if;

  insert into silver.manage(id,email,role,galaxy,time,birthday)
  values(v_scope,v_email,'scope','galaxy','time',p_birthday);

  select coalesce(max(sort_order),0)+10 into v_sort_order from silver.scope_registry where parent_scope_id=v_parent;
  insert into silver.scope_registry(scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
  values(v_scope,v_name,'scope',nullif(v_domain,''),nullif(v_directory,''),v_parent,true,v_sort_order);

  if p_copy_keywords then
    select current_keyword_class_id into v_source_class from silver.lo3rwang where id='lo3rwang';
    if v_source_class is null then raise exception 'lo3rwang current Keyword Class is not configured'; end if;
    v_new_class := gen_random_uuid();
    insert into silver.keyword_classes(class_id,scope_id) values(v_new_class,v_scope);
    execute format(
      'insert into silver.%I
        (class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
       select $1,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable
       from silver.lo3rwang_keywords where class_id=$2 order by order_no,item_no',
      v_keywords_name
    ) using v_new_class,v_source_class;
    get diagnostics v_keyword_count = row_count;
    if v_keyword_count<>66 then raise exception 'Rune66 default copy expected 66 rows, copied %',v_keyword_count; end if;
  end if;

  execute format(
    'insert into silver.%I
      (id,email,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able,
       keyword_min_chars,keyword_min_documents,current_keyword_class_id,
       keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime,updated_at)
     values($1,$2,$3,'''',array[$1,$3]::text[],$4,''zh-Hant'',true,true,true,32,100,$5,false,0,''{}''::jsonb,null,now())',
    v_config_name
  ) using v_scope,v_email,v_name,v_theme,v_new_class;

  -- New Scopes start with no content rows. Editors add index/governance
  -- text frames only when authored; avoid empty default frames and legacy pages.

  -- PostgREST schema cache must see the six new relations after this transaction commits.
  perform pg_catalog.pg_notify('pgrst','reload schema');

  return jsonb_build_object(
    'scope_id',v_scope,'display_name',v_name,'parent_scope_id',v_parent,
    'route_mode',case when v_domain<>'' then 'domain' else 'directory' end,
    'route_value',case when v_domain<>'' then v_domain else v_directory end,
    'keyword_rows',v_keyword_count,'keyword_class_id',v_new_class
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION api.read_keyword_class(p_scope_id text, p_class_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_config regclass;
  v_keywords regclass;
  v_share boolean := false;
  v_allowed boolean := false;
  v_result jsonb := '[]'::jsonb;
begin
  if v_scope !~ '^[a-z][a-z0-9]*$' then
    return null;
  end if;

  if not exists(
    select 1
    from silver.keyword_classes
    where class_id=p_class_id and scope_id=v_scope
  ) then
    return null;
  end if;

  v_config := to_regclass(format('silver.%I',v_scope));
  v_keywords := to_regclass(format('silver.%I_keywords',v_scope));
  if v_config is null or v_keywords is null then
    return null;
  end if;

  v_allowed := silver.can_manage_scope(v_scope);
  if not v_allowed then
    begin
      execute format(
        'select coalesce(keyword_class_share_enabled,false) from %s where id=$1',
        v_config
      )
      into v_share
      using v_scope;
    exception when undefined_column then
      v_share := false;
    end;
    v_allowed := v_share;
  end if;

  if not v_allowed then
    return null;
  end if;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(k) order by k.order_no,k.item_no),''[]''::jsonb) from %s k where k.class_id=$1',
    v_keywords
  )
  into v_result
  using p_class_id;

  return coalesce(v_result,'[]'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.is_current_email_blocklisted()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM silver.email_blocklist
    WHERE email = silver.current_auth_email()
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.read_scope_page_copy(p_scope_id text)
 RETURNS TABLE("Title_TW" text, "Desc_TW" text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT nullif(btrim(m."Title_TW"),''), nullif(btrim(m."Desc_TW"),'')
  FROM silver.manage AS m
  JOIN silver.scope_registry AS r
    ON r.scope_id=m.id AND r.scope_kind='scope' AND r.active IS TRUE
  WHERE m.id=lower(btrim(p_scope_id))
    AND lower(btrim(p_scope_id)) ~ '^[a-z][a-z0-9]{0,14}$'
  ORDER BY m.email
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION silver.normalize_galaxy_content_validity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 BEGIN
 IF NEW.content IS NULL OR btrim(NEW.content)='' THEN
 NEW.content := NULL;
 NEW.searchable := false;
 END IF;
 RETURN NEW;
 END;
 $function$
;

CREATE OR REPLACE FUNCTION silver.set_scope_extra_sign_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.extra_sign := silver.registered_scope_extra_sign(new.scope_id,new.scope_kind);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.sync_scope_config_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_TABLE_SCHEMA <> 'silver' OR NEW.id IS DISTINCT FROM TG_TABLE_NAME
     OR btrim(coalesce(NEW.display_name,''))='' THEN
    RAISE EXCEPTION 'Invalid Scope display_name sync target';
  END IF;
  UPDATE silver.scope_registry
     SET display_name=btrim(NEW.display_name),updated_at=now()
   WHERE scope_id=NEW.id AND scope_kind='scope'
     AND display_name IS DISTINCT FROM btrim(NEW.display_name);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION silver.touch_visual_novel_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'silver'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.management_write(p_table text, p_operation text, p_rows jsonb DEFAULT NULL::jsonb, p_values jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.management_write(p_table,p_operation,p_rows,p_values,p_filters)
$function$
;

CREATE OR REPLACE FUNCTION silver.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.apply_keyword_classification(p_scope_id,p_rows)
$function$
;

CREATE OR REPLACE FUNCTION silver.copy_rune66_keyword_class(p_scope_id text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.copy_rune66_keyword_class(p_scope_id) $function$
;

CREATE OR REPLACE FUNCTION silver.delete_scope(p_scope_id text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.delete_scope(p_scope_id) $function$
;

CREATE OR REPLACE FUNCTION silver.log_search_keyword(p_scope_id text, p_query_text text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.log_search_keyword(p_scope_id,p_query_text)
$function$
;

CREATE OR REPLACE FUNCTION silver.manage_scope_registry(p_operation text, p_scope_id text, p_values jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.manage_scope_registry(p_operation,p_scope_id,p_values)
$function$
;

CREATE OR REPLACE FUNCTION silver.move_scope_block(p_scope_id text, p_page_name text, p_uid text, p_direction integer)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.move_scope_block(p_scope_id,p_page_name,p_uid,p_direction) $function$
;

CREATE OR REPLACE FUNCTION silver.provision_scope(p_scope_id text, p_display_name text, p_email text, p_birthday date DEFAULT NULL::date, p_domain text DEFAULT NULL::text, p_directory text DEFAULT NULL::text, p_parent_scope_id text DEFAULT 'loc'::text, p_theme text DEFAULT 'theme-7'::text, p_copy_keywords boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.provision_scope(
    p_scope_id,p_display_name,p_email,p_birthday,p_domain,p_directory,
    p_parent_scope_id,p_theme,p_copy_keywords
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.read_keyword_class(p_scope_id text, p_class_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.read_keyword_class(p_scope_id,p_class_id)
$function$
;

CREATE VIEW "api"."lo3rwang_keywords_manage" WITH (security_invoker=true,check_option=local) AS  SELECT keyword_id,
    class_id,
    group_name,
    item_no,
    item_name,
    principle,
    keywords,
    order_no,
    class_name,
    class_group,
    class_enable
   FROM silver.lo3rwang_keywords
  WHERE silver.can_manage_scope('lo3rwang'::text);

CREATE TRIGGER visual_novel_touch_updated_at BEFORE UPDATE ON silver."VisualNovel" FOR EACH ROW EXECUTE FUNCTION silver.touch_visual_novel_updated_at();

CREATE TRIGGER sync_scope_display_name AFTER INSERT OR UPDATE OF display_name ON silver.lo3rwang FOR EACH ROW EXECUTE FUNCTION silver.sync_scope_config_display_name();

CREATE TRIGGER lo3rwang_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lo3rwang_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER sync_scope_display_name AFTER INSERT OR UPDATE OF display_name ON silver.lrunes FOR EACH ROW EXECUTE FUNCTION silver.sync_scope_config_display_name();

CREATE TRIGGER lrunes_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lrunes_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER scope_registry_register_extra_sign BEFORE INSERT ON silver.scope_registry FOR EACH ROW EXECUTE FUNCTION silver.set_scope_extra_sign_on_insert();

ALTER TABLE "api"."user_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "api"."user_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."VisualNovel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."database_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."email_blocklist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."game" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."keyword_classes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_time" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_search_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_theme" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_daily" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_time" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."manage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes_etc" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes_group" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_group_source_sharing" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_other_sources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_registry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_source_subcategories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."statistics_source_aliases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."statistics_source_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_records_owner_all" ON "api"."user_records" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "user_settings_owner_all" ON "api"."user_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "database_targets_admin_all" ON "silver"."database_targets" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "email_blocklist_admin_add" ON "silver"."email_blocklist" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((silver.can_manage_global() AND (email <> silver.current_auth_email())));

CREATE POLICY "email_blocklist_admin_read" ON "silver"."email_blocklist" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_global());

CREATE POLICY "email_blocklist_admin_remove" ON "silver"."email_blocklist" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_global());

CREATE POLICY "game_public_read" ON "silver"."game" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "game_scope_delete" ON "silver"."game" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "game_scope_insert" ON "silver"."game" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "game_scope_update" ON "silver"."game" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "keyword_classes_scope_delete" ON "silver"."keyword_classes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_insert" ON "silver"."keyword_classes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_select" ON "silver"."keyword_classes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "lo3rwang_public_read" ON "silver"."lo3rwang" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_scope_update" ON "silver"."lo3rwang" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_blocks_public_read" ON "silver"."lo3rwang_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_blocks_scope_write" ON "silver"."lo3rwang_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_authenticated_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((searchable IS TRUE) OR silver.can_manage_scope('lo3rwang'::text)));

CREATE POLICY "lo3rwang_galaxy_public_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous" USING ((searchable IS TRUE));

CREATE POLICY "lo3rwang_galaxy_scope_update" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_media_public_read" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_media_scope_update" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_keywords_scope_all" ON "silver"."lo3rwang_keywords" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_public_read" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_time_scope_delete" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_scope_insert" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_scope_update" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "loc_blocks_admin_write" ON "silver"."loc_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "loc_blocks_public_read" ON "silver"."loc_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "loc_search_keywords_admin_read" ON "silver"."loc_search_keywords" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((silver.can_manage_global() AND (searched_at >= (now() - '7 days'::interval))));

CREATE POLICY "loc_theme_admin_write" ON "silver"."loc_theme" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "loc_theme_public_read" ON "silver"."loc_theme" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_public_read" ON "silver"."lrunes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_scope_update" ON "silver"."lrunes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_blocks_public_read" ON "silver"."lrunes_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_blocks_scope_write" ON "silver"."lrunes_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_public_read" ON "silver"."lrunes_daily" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_daily_scope_delete" ON "silver"."lrunes_daily" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_insert" ON "silver"."lrunes_daily" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_update" ON "silver"."lrunes_daily" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_authenticated_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((searchable IS TRUE) OR silver.can_manage_scope('lrunes'::text)));

CREATE POLICY "lrunes_galaxy_public_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous" USING ((searchable IS TRUE));

CREATE POLICY "lrunes_galaxy_scope_update" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_media_public_read" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_media_scope_update" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_public_read" ON "silver"."lrunes_time" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_time_scope_delete" ON "silver"."lrunes_time" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_scope_insert" ON "silver"."lrunes_time" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_scope_update" ON "silver"."lrunes_time" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "manage_authenticated_read" ON "silver"."manage" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "manage_public_mapping_read" ON "silver"."manage" AS PERMISSIVE FOR SELECT TO "anonymous" USING (true);

CREATE POLICY "runes_public_read" ON "silver"."runes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_scope_update" ON "silver"."runes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "runes_etc_public_read" ON "silver"."runes_etc" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_group_public_read" ON "silver"."runes_group" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_group_source_sharing_insert" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_group_source_sharing_read" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_group_source_sharing_update" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_other_sources_public_read" ON "silver"."scope_other_sources" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_other_sources_scope_insert" ON "silver"."scope_other_sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_other_sources_scope_update" ON "silver"."scope_other_sources" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_registry_anonymous_read" ON "silver"."scope_registry" AS PERMISSIVE FOR SELECT TO "anonymous" USING (true);

CREATE POLICY "scope_registry_authenticated_read" ON "silver"."scope_registry" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "scope_source_subcategories_insert" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_source_subcategories_read" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_source_subcategories_update" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "source_aliases_admin_insert" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_aliases_admin_update" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_aliases_public_read" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "source_categories_admin_insert" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_categories_admin_update" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_categories_public_read" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

GRANT USAGE ON SCHEMA silver,api TO anonymous,authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA silver,api FROM PUBLIC;

GRANT EXECUTE ON FUNCTION api.request_claims(),api.current_user_id(),silver.current_auth_email(),silver.can_manage_global(),silver.can_manage_scope(text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.management_write(text,text,jsonb,jsonb,jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION silver.management_write(text,text,jsonb,jsonb,jsonb),silver.apply_keyword_classification(text,jsonb),silver.copy_rune66_keyword_class(text),silver.delete_scope(text),silver.log_search_keyword(text,text),silver.manage_scope_registry(text,text,jsonb),silver.move_scope_block(text,text,text,integer),silver.provision_scope(text,text,text,date,text,text,text,text,boolean),silver.is_current_email_blocklisted(),silver.read_keyword_class(text,uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION silver.read_scope_page_copy(text),silver.log_search_keyword(text,text),silver.read_keyword_class(text,uuid) TO anonymous,authenticated;

GRANT DELETE ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT INSERT ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT SELECT ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT UPDATE ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT DELETE ON "api"."user_records" TO "authenticated";

GRANT INSERT ON "api"."user_records" TO "authenticated";

GRANT SELECT ON "api"."user_records" TO "authenticated";

GRANT UPDATE ON "api"."user_records" TO "authenticated";

GRANT DELETE ON "api"."user_settings" TO "authenticated";

GRANT INSERT ON "api"."user_settings" TO "authenticated";

GRANT SELECT ON "api"."user_settings" TO "authenticated";

GRANT UPDATE ON "api"."user_settings" TO "authenticated";

GRANT DELETE ON "silver"."database_targets" TO "authenticated";

GRANT INSERT ON "silver"."database_targets" TO "authenticated";

GRANT SELECT ON "silver"."database_targets" TO "authenticated";

GRANT UPDATE ON "silver"."database_targets" TO "authenticated";

GRANT DELETE ON "silver"."email_blocklist" TO "authenticated";

GRANT INSERT ON "silver"."email_blocklist" TO "authenticated";

GRANT SELECT ON "silver"."email_blocklist" TO "authenticated";

GRANT SELECT ON "silver"."game" TO "anonymous";

GRANT DELETE ON "silver"."game" TO "authenticated";

GRANT INSERT ON "silver"."game" TO "authenticated";

GRANT SELECT ON "silver"."game" TO "authenticated";

GRANT UPDATE ON "silver"."game" TO "authenticated";

GRANT DELETE ON "silver"."keyword_classes" TO "authenticated";

GRANT INSERT ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_blocks" TO "anonymous";

GRANT DELETE ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT DELETE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "anonymous";

GRANT DELETE ON "silver"."lo3rwang_time" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."loc_blocks" TO "anonymous";

GRANT DELETE ON "silver"."loc_blocks" TO "authenticated";

GRANT INSERT ON "silver"."loc_blocks" TO "authenticated";

GRANT SELECT ON "silver"."loc_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."loc_blocks" TO "authenticated";

GRANT SELECT ON "silver"."loc_search_keywords" TO "authenticated";

GRANT SELECT ON "silver"."loc_theme" TO "anonymous";

GRANT DELETE ON "silver"."loc_theme" TO "authenticated";

GRANT INSERT ON "silver"."loc_theme" TO "authenticated";

GRANT SELECT ON "silver"."loc_theme" TO "authenticated";

GRANT UPDATE ON "silver"."loc_theme" TO "authenticated";

GRANT SELECT ON "silver"."lrunes" TO "anonymous";

GRANT SELECT ON "silver"."lrunes" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_blocks" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_blocks" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_daily" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_daily" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_daily" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_daily" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_daily" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lrunes_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lrunes_galaxy_media" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_time" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_time" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_time" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."manage" TO "anonymous";

GRANT SELECT ON "silver"."manage" TO "anonymous";

GRANT SELECT ON "silver"."manage" TO "authenticated";

GRANT SELECT ON "silver"."runes" TO "anonymous";

GRANT SELECT ON "silver"."runes" TO "authenticated";

GRANT SELECT ON "silver"."runes_etc" TO "anonymous";

GRANT SELECT ON "silver"."runes_etc" TO "authenticated";

GRANT SELECT ON "silver"."runes_group" TO "anonymous";

GRANT SELECT ON "silver"."runes_group" TO "authenticated";

GRANT SELECT ON "silver"."scope_group_source_sharing" TO "anonymous";

GRANT INSERT ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT SELECT ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT UPDATE ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT SELECT ON "silver"."scope_other_sources" TO "anonymous";

GRANT INSERT ON "silver"."scope_other_sources" TO "authenticated";

GRANT SELECT ON "silver"."scope_other_sources" TO "authenticated";

GRANT UPDATE ON "silver"."scope_other_sources" TO "authenticated";

GRANT SELECT ON "silver"."scope_registry" TO "anonymous";

GRANT SELECT ON "silver"."scope_registry" TO "anonymous";

GRANT SELECT ON "silver"."scope_registry" TO "authenticated";

GRANT SELECT ON "silver"."scope_source_subcategories" TO "anonymous";

GRANT INSERT ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT SELECT ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT UPDATE ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_aliases" TO "anonymous";

GRANT INSERT ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT UPDATE ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_categories" TO "anonymous";

GRANT INSERT ON "silver"."statistics_source_categories" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_categories" TO "authenticated";

GRANT UPDATE ON "silver"."statistics_source_categories" TO "authenticated";

GRANT SELECT (id,role,birthday,galaxy,time) ON silver.manage TO anonymous;

GRANT USAGE,SELECT ON SEQUENCE silver.lo3rwang_keywords_keyword_id_seq TO authenticated;
::text)
);

CREATE TABLE "silver"."email_blocklist" (
  "email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_blocklist_format" CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text),
  CONSTRAINT "email_blocklist_normalized" CHECK (email = lower(btrim(email))),
  CONSTRAINT "email_blocklist_pkey" PRIMARY KEY (email)
);

CREATE TABLE "silver"."game" (
  "game_key" text NOT NULL,
  "record_type" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'current'::text NOT NULL,
  "is_current" boolean DEFAULT true NOT NULL,
  "event_id" text,
  "event_group" text,
  "event_title" text,
  "event_requirement" text,
  "event_description" text,
  "rune_id" integer,
  "rune_name" text,
  "rune_group" text,
  "rune_action_text" text,
  "rune_action_kind" text,
  "rune_action_value" integer,
  "role_id" integer,
  "role_formal_name" text,
  "role_public_name" text,
  "role_group" text,
  "role_core_function" text,
  "role_intervention_type" text,
  "role_intervention_name" text,
  "role_tool" text,
  "role_tagline" text,
  "rule_code" text,
  "rule_title" text,
  "rule_text" text,
  "macro_code" text,
  "macro_group_a" text,
  "macro_group_b" text,
  "macro_title" text,
  "macro_description" text,
  "asset_code" text,
  "asset_kind" text,
  "asset_group" text,
  "asset_path" text,
  "asset_title" text,
  "source_note" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rule_round_no" integer,
  "rule_phase" text,
  "rule_result_code" text,
  "rule_de_delta" integer,
  "rule_draw_count" integer,
  "rule_value_int" integer,
  "rule_value_text" text,
  "asset_group_2" text,
  "event_group_2" text,
  CONSTRAINT "game_check" CHECK (record_type = 'event'::text AND event_id IS NOT NULL OR record_type = 'rune_action'::text AND rune_id IS NOT NULL OR record_type = 'role'::text AND role_id IS NOT NULL OR record_type = 'rule'::text AND rule_code IS NOT NULL OR record_type = 'macro'::text AND macro_code IS NOT NULL OR record_type = 'asset'::text AND asset_code IS NOT NULL),
  CONSTRAINT "game_pkey" PRIMARY KEY (game_key),
  CONSTRAINT "game_record_type_check" CHECK (record_type = ANY (ARRAY['event'::text, 'rune_action'::text, 'role'::text, 'rule'::text, 'macro'::text, 'asset'::text])),
  CONSTRAINT "game_status_check" CHECK (status = ANY (ARRAY['current'::text, 'alpha'::text, 'historical'::text]))
);

CREATE TABLE "silver"."keyword_classes" (
  "class_id" uuid NOT NULL,
  "scope_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "keyword_classes_pkey" PRIMARY KEY (class_id)
);

CREATE TABLE "silver"."lo3rwang" (
  "id" text NOT NULL,
  "email" text,
  "period" text,
  "period_start" date,
  "period_end" date,
  "style" integer,
  "theme" text DEFAULT 'theme-7'::text NOT NULL,
  "search_able" boolean DEFAULT true NOT NULL,
  "statistics_able" boolean DEFAULT true NOT NULL,
  "culture_able" boolean DEFAULT true NOT NULL,
  "sources" text[] DEFAULT ARRAY['facebook'::text, 'threads'::text, 'ig'::text, 'x'::text, 'others'::text] NOT NULL,
  "source_counts" jsonb DEFAULT '{"x": 0, "ig": 0, "others": 0, "threads": 0, "facebook": 0}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "media_count" integer DEFAULT 0 NOT NULL,
  "media_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "keyword_min_chars" integer DEFAULT 32 NOT NULL,
  "keyword_min_documents" integer DEFAULT 100 NOT NULL,
  "staticstime" timestamp with time zone,
  "current_keyword_class_id" uuid,
  "keyword_class_share_enabled" boolean DEFAULT false NOT NULL,
  "keyword_document_count" integer DEFAULT 0 NOT NULL,
  "keyword_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_name" text NOT NULL,
  "search_intro" text DEFAULT ''::text NOT NULL,
  "search_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "locale" text DEFAULT 'zh-Hant'::text NOT NULL,
  CONSTRAINT "lo3rwang_keyword_document_count_check" CHECK (keyword_document_count >= 0),
  CONSTRAINT "lo3rwang_keyword_min_chars_check" CHECK (keyword_min_chars >= 0 AND keyword_min_chars <= 10000),
  CONSTRAINT "lo3rwang_keyword_min_documents_check" CHECK (keyword_min_documents >= 0 AND keyword_min_documents <= 1000000),
  CONSTRAINT "lo3rwang_locale_check" CHECK (locale = ANY (ARRAY['zh-Hant'::text, 'zh-Hans'::text, 'en'::text])),
  CONSTRAINT "lo3rwang_pkey" PRIMARY KEY (id)
);

CREATE TABLE "silver"."lo3rwang_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "lo3rwang_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "lo3rwang_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "lo3rwang_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lo3rwang_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lo3rwang_galaxy" (
  "uid" character(8) NOT NULL,
  "title" text,
  "content" text,
  "createtime" timestamp with time zone,
  "source_native_id" text,
  "source_place" text,
  "searchable" boolean DEFAULT true NOT NULL,
  "UpdateTime" timestamp with time zone DEFAULT now() NOT NULL,
  "url" text,
  "source_id" character(8),
  "target_id" text[],
  "ref_id" character(8),
  "source_name" text,
  "media_link" uuid[],
  "statistics_able" boolean DEFAULT true NOT NULL,
  "class_id" smallint,
  "group_lists" jsonb DEFAULT 'false'::jsonb NOT NULL,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_class_id_check" CHECK (class_id IS NULL OR class_id >= 1 AND class_id <= 8),
  CONSTRAINT "lo3rwang_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lo3rwang_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
  CONSTRAINT "lo3rwang_galaxy_group_lists_shape_check" CHECK (group_lists = 'false'::jsonb OR jsonb_typeof(group_lists) = 'object'::text),
  CONSTRAINT "lo3rwang_galaxy_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lo3rwang_galaxy_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lo3rwang_galaxy_media" (
  "media_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "galaxy_link" character(8),
  "source_native_id" text,
  "media_type" text NOT NULL,
  "title" text,
  "url" text,
  "meta_tags" text,
  "createtime" timestamp with time zone,
  "source_place" text,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_media_pkey" PRIMARY KEY (media_id)
);

CREATE TABLE "silver"."lo3rwang_keywords" (
  "keyword_id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "group_name" text NOT NULL,
  "item_no" integer NOT NULL,
  "item_name" text NOT NULL,
  "principle" text DEFAULT ''::text NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "order_no" integer DEFAULT 0 NOT NULL,
  "class_name" text NOT NULL,
  "class_group" text NOT NULL,
  "class_enable" boolean DEFAULT true NOT NULL,
  "class_id" uuid NOT NULL,
  CONSTRAINT "lo3rwang_keywords_array_check" CHECK (jsonb_typeof(keywords) = 'array'::text),
  CONSTRAINT "lo3rwang_keywords_class_group_nonempty" CHECK (length(btrim(class_group)) > 0),
  CONSTRAINT "lo3rwang_keywords_class_name_nonempty" CHECK (length(btrim(class_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_group_nonempty" CHECK (length(btrim(group_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_item_no_positive" CHECK (item_no > 0),
  CONSTRAINT "lo3rwang_keywords_item_nonempty" CHECK (length(btrim(item_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_pkey" PRIMARY KEY (keyword_id)
);

CREATE TABLE "silver"."lo3rwang_time" (
  "record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "record_type" text NOT NULL,
  "resource_id" text,
  "label" text,
  "display_order" integer,
  "status" text,
  "note" text,
  "time_date" date,
  "anchor_ids" text[],
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "style_description" text,
  CONSTRAINT "lo3rwang_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lo3rwang_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text, 'style_comment'::text])),
  CONSTRAINT "lo3rwang_time_record_type_resource_id_key" UNIQUE (record_type, resource_id),
  CONSTRAINT "lo3rwang_time_style_comment_shape_check" CHECK (record_type <> 'style_comment'::text OR NULLIF(btrim(label), ''::text) IS NOT NULL AND NULLIF(btrim(style_description), ''::text) IS NOT NULL AND (status = 'needs_anchor'::text AND anchor_ids IS NULL OR status IS DISTINCT FROM 'needs_anchor'::text AND COALESCE(cardinality(anchor_ids), 0) = 1 AND NULLIF(btrim(COALESCE(anchor_ids[1], ''::text)), ''::text) IS NOT NULL AND COALESCE(anchor_ids[1], '0'::text) <> '0'::text))
);

CREATE TABLE "silver"."loc_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "loc_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "loc_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "loc_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "loc_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."loc_search_keywords" (
  "search_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "searched_at" timestamp with time zone DEFAULT now() NOT NULL,
  "scope_id" text NOT NULL,
  "query_text" text NOT NULL,
  CONSTRAINT "loc_search_keywords_pkey" PRIMARY KEY (search_id),
  CONSTRAINT "loc_search_keywords_query_text_check" CHECK (btrim(query_text) <> ''::text AND char_length(query_text) <= 200),
  CONSTRAINT "loc_search_keywords_scope_id_check" CHECK (scope_id ~ '^[a-z][a-z0-9]{0,31}$'::text)
);

CREATE TABLE "silver"."loc_theme" (
  "theme_id" smallint NOT NULL,
  "theme_name" text NOT NULL,
  "theme_order" integer NOT NULL,
  "scheme" text NOT NULL,
  "style_key" text NOT NULL,
  "identity_color" text NOT NULL,
  "loc_bg" text NOT NULL,
  "loc_panel" text NOT NULL,
  "loc_panel_2" text NOT NULL,
  "loc_panel_strong" text NOT NULL,
  "loc_panel_nav" text NOT NULL,
  "loc_panel_tab" text NOT NULL,
  "loc_rune_bg" text NOT NULL,
  "loc_rune_selected_bg" text NOT NULL,
  "loc_line" text NOT NULL,
  "loc_line_soft" text NOT NULL,
  "loc_line_softer" text NOT NULL,
  "loc_line_faint" text NOT NULL,
  "loc_text" text NOT NULL,
  "loc_muted" text NOT NULL,
  "loc_heading" text NOT NULL,
  "loc_accent" text NOT NULL,
  "loc_gold" text NOT NULL,
  "loc_danger" text NOT NULL,
  "loc_surface" text NOT NULL,
  "loc_surface_soft" text NOT NULL,
  "loc_surface_faint" text NOT NULL,
  "loc_surface_status" text NOT NULL,
  "loc_accent_surface" text NOT NULL,
  "loc_accent_surface_strong" text NOT NULL,
  "loc_accent_border" text NOT NULL,
  "loc_accent_border_soft" text NOT NULL,
  "loc_accent_border_faint" text NOT NULL,
  "loc_gold_surface" text NOT NULL,
  "loc_gold_surface_soft" text NOT NULL,
  "loc_gold_border" text NOT NULL,
  "loc_gold_border_soft" text NOT NULL,
  "loc_gold_border_faint" text NOT NULL,
  "loc_gold_ring" text NOT NULL,
  "loc_gold_ring_soft" text NOT NULL,
  "loc_danger_border" text NOT NULL,
  "loc_primary_start" text NOT NULL,
  "loc_primary_end" text NOT NULL,
  "loc_body_glow" text NOT NULL,
  "loc_body_mid" text NOT NULL,
  "loc_hero_start" text NOT NULL,
  "loc_hero_end" text NOT NULL,
  "loc_shadow" text NOT NULL,
  "loc_shadow_card" text NOT NULL,
  CONSTRAINT "loc_theme_id_check" CHECK (theme_id >= 1 AND theme_id <= 8),
  CONSTRAINT "loc_theme_order_check" CHECK (theme_order >= 1 AND theme_order <= 8),
  CONSTRAINT "loc_theme_pkey" PRIMARY KEY (theme_id),
  CONSTRAINT "loc_theme_scheme_check" CHECK (scheme = ANY (ARRAY['light'::text, 'dark'::text]))
);

CREATE TABLE "silver"."lrunes" (
  "id" text NOT NULL,
  "email" text,
  "period" text,
  "period_start" date,
  "period_end" date,
  "style" integer,
  "theme" text DEFAULT 'theme-7'::text NOT NULL,
  "search_able" boolean DEFAULT true NOT NULL,
  "statistics_able" boolean DEFAULT true NOT NULL,
  "culture_able" boolean DEFAULT true NOT NULL,
  "sources" text[] DEFAULT ARRAY['facebook'::text, 'threads'::text, 'ig'::text, 'x'::text, 'others'::text] NOT NULL,
  "source_counts" jsonb DEFAULT '{"x": 0, "ig": 0, "others": 0, "threads": 0, "facebook": 0}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "media_count" integer DEFAULT 0 NOT NULL,
  "media_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_name" text NOT NULL,
  "search_intro" text DEFAULT ''::text NOT NULL,
  "search_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "locale" text DEFAULT 'zh-Hant'::text NOT NULL,
  CONSTRAINT "lrunes_locale_check" CHECK (locale = ANY (ARRAY['zh-Hant'::text, 'zh-Hans'::text, 'en'::text])),
  CONSTRAINT "lrunes_pkey" PRIMARY KEY (id)
);

CREATE TABLE "silver"."lrunes_blocks" (
  "block_title" text DEFAULT ''::text NOT NULL,
  "block_text" text DEFAULT ''::text NOT NULL,
  "block_order" integer NOT NULL,
  "uid" character(8) DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
  "page_name" text NOT NULL,
  "block_entity" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "block_eyebrow" text DEFAULT ''::text NOT NULL,
  "block_subtitle" text DEFAULT ''::text NOT NULL,
  CONSTRAINT "lrunes_blocks_entity_check" CHECK (jsonb_typeof(block_entity) = 'array'::text AND jsonb_array_length(block_entity) <= 6),
  CONSTRAINT "lrunes_blocks_order_check" CHECK (block_order >= 1),
  CONSTRAINT "lrunes_blocks_pkey" PRIMARY KEY (uid),
  CONSTRAINT "lrunes_blocks_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text)
);

CREATE TABLE "silver"."lrunes_daily" (
  "record_id" text NOT NULL,
  "record_date" date NOT NULL,
  "draw_kind" text NOT NULL,
  "rune_number" integer NOT NULL,
  "direction" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "recorded_phase" text,
  CONSTRAINT "lrunes_daily_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_daily_record_date_draw_kind_key" UNIQUE (record_date, draw_kind),
  CONSTRAINT "lrunes_daily_rune_number_check" CHECK (rune_number >= 0 AND rune_number <= 66)
);

CREATE TABLE "silver"."lrunes_galaxy" (
  "uid" character(8) NOT NULL,
  "title" text,
  "content" text,
  "createtime" timestamp with time zone,
  "source_native_id" text,
  "source_place" text,
  "searchable" boolean DEFAULT true NOT NULL,
  "UpdateTime" timestamp with time zone DEFAULT now() NOT NULL,
  "url" text,
  "source_id" character(8),
  "target_id" text[],
  "ref_id" character(8),
  "source_name" text,
  "media_link" uuid[],
  "statistics_able" boolean DEFAULT true NOT NULL,
  "class_id" smallint,
  "group_lists" jsonb DEFAULT 'false'::jsonb NOT NULL,
  "content_blocks" jsonb,
  CONSTRAINT "lo3rwang_galaxy_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text),
  CONSTRAINT "lrunes_galaxy_class_id_check" CHECK (class_id IS NULL OR class_id >= 1 AND class_id <= 8),
  CONSTRAINT "lrunes_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lrunes_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
  CONSTRAINT "lrunes_galaxy_group_lists_shape_check" CHECK (group_lists = 'false'::jsonb OR jsonb_typeof(group_lists) = 'object'::text),
  CONSTRAINT "lrunes_galaxy_pkey" PRIMARY KEY (uid)
);

CREATE TABLE "silver"."lrunes_galaxy_media" (
  "media_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "galaxy_link" character(8),
  "source_native_id" text,
  "media_type" text NOT NULL,
  "title" text,
  "url" text,
  "meta_tags" text,
  "createtime" timestamp with time zone,
  "source_place" text,
  "content_blocks" jsonb,
  CONSTRAINT "lrunes_galaxy_media_pkey" PRIMARY KEY (media_id)
);

CREATE TABLE "silver"."lrunes_time" (
  "record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "record_type" text NOT NULL,
  "resource_id" text,
  "label" text,
  "display_order" integer,
  "status" text,
  "note" text,
  "time_date" date,
  "anchor_ids" text[],
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "style_description" text,
  CONSTRAINT "lrunes_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text, 'style_comment'::text])),
  CONSTRAINT "lrunes_time_record_type_resource_id_key" UNIQUE (record_type, resource_id),
  CONSTRAINT "lrunes_time_style_comment_shape_check" CHECK (record_type <> 'style_comment'::text OR NULLIF(btrim(label), ''::text) IS NOT NULL AND NULLIF(btrim(style_description), ''::text) IS NOT NULL AND (status = 'needs_anchor'::text AND anchor_ids IS NULL OR status IS DISTINCT FROM 'needs_anchor'::text AND COALESCE(cardinality(anchor_ids), 0) = 1 AND NULLIF(btrim(COALESCE(anchor_ids[1], ''::text)), ''::text) IS NOT NULL AND COALESCE(anchor_ids[1], '0'::text) <> '0'::text))
);

CREATE TABLE "silver"."manage" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "galaxy" text,
  "time" text,
  "birthday" date,
  "Title_TW" text,
  "Desc_TW" text,
  CONSTRAINT "manage_pkey" PRIMARY KEY (id, email),
  CONSTRAINT "manage_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'scope'::text]))
);

CREATE TABLE "silver"."runes" (
  "rune_id" smallint NOT NULL,
  "rune_name" character varying(1),
  "english_name" character varying(12),
  "totem" character varying(2),
  "group_name" character varying(12),
  "moon_phase" smallint,
  "card_attr" smallint,
  "rune_description" character varying(40),
  "archetype" character varying(10),
  "char_action" character varying(60),
  "positive_keywords" text,
  "negative_keywords" text,
  "extra_rules" text,
  "extra_notes" text,
  "positive_meaning" character varying(40),
  "half_positive_meaning" character varying(40),
  "half_reverse_meaning" character varying(40),
  "reverse_meaning" character varying(40),
  "rune_evolution_history" character varying(32),
  "myth_story" character varying(48),
  "soul_question" character varying(16),
  "practice_challenge" character varying(20),
  "ritual_advice" character varying(28),
  "harmony_advice" character varying(32),
  "class_enable" boolean DEFAULT true NOT NULL,
  CONSTRAINT "runes_card_attr_check" CHECK (card_attr >= 1 AND card_attr <= 4),
  CONSTRAINT "runes_moon_phase_check" CHECK (moon_phase >= 1 AND moon_phase <= 4),
  CONSTRAINT "runes_pkey" PRIMARY KEY (rune_id),
  CONSTRAINT "runes_rune_id_check" CHECK (rune_id >= 0 AND rune_id <= 66)
);

CREATE TABLE "silver"."runes_etc" (
  "rune_id" smallint NOT NULL,
  "dir" smallint NOT NULL,
  "type" character varying(10) NOT NULL,
  "desc" character varying(80) NOT NULL,
  "current_moon" character varying DEFAULT ''::character varying NOT NULL,
  CONSTRAINT "runes_etc_current_moon_check" CHECK (current_moon::text = ANY (ARRAY[''::character varying::text, '新月'::character varying::text, '上弦'::character varying::text, '滿月'::character varying::text, '下弦'::character varying::text, '空亡'::character varying::text])),
  CONSTRAINT "runes_etc_dir_check" CHECK (dir >= 1 AND dir <= 4),
  CONSTRAINT "runes_etc_pkey" PRIMARY KEY (rune_id, dir, type, current_moon),
  CONSTRAINT "runes_etc_rune_id_check" CHECK (rune_id >= 0 AND rune_id <= 66)
);

CREATE TABLE "silver"."runes_group" (
  "group_id" character varying(2) NOT NULL,
  "english_name" character varying(10) NOT NULL,
  "desc" character varying(40) NOT NULL,
  "quality" character varying(10) NOT NULL,
  "style" character varying(24) NOT NULL,
  "runeslist" smallint[] NOT NULL,
  CONSTRAINT "runes_group_pkey" PRIMARY KEY (group_id)
);

CREATE TABLE "silver"."scope_group_source_sharing" (
  "scope_id" text NOT NULL,
  "category_code" text NOT NULL,
  "share_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_group_source_sharing_pkey" PRIMARY KEY (scope_id, category_code)
);

CREATE TABLE "silver"."scope_other_sources" (
  "scope_id" text NOT NULL,
  "source_key" text NOT NULL,
  "display_name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_other_sources_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "scope_other_sources_pkey" PRIMARY KEY (scope_id, source_key),
  CONSTRAINT "scope_other_sources_source_key_check" CHECK (char_length(btrim(source_key)) >= 1 AND char_length(btrim(source_key)) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."scope_registry" (
  "scope_id" text NOT NULL,
  "display_name" text NOT NULL,
  "scope_kind" text DEFAULT 'scope'::text NOT NULL,
  "domain" text,
  "directory" text,
  "parent_scope_id" text,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "extra_sign" text,
  CONSTRAINT "scope_registry_canonical_route_check" CHECK ((domain IS NULL) <> (directory IS NULL) AND
CASE
    WHEN scope_id = 'loc'::text THEN domain = 'loc.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'admin'::text THEN domain = 'admin.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'lrunes'::text THEN domain = 'lrunes.lo3rwang.cc'::text AND directory IS NULL
    WHEN scope_id = 'lo3rwang'::text THEN domain IS NULL AND directory = '/lo3rwang'::text
    ELSE domain IS NOT NULL AND domain = (scope_id || '.lo3rwang.cc'::text) AND directory IS NULL OR directory IS NOT NULL AND directory = ('/'::text || scope_id) AND domain IS NULL
END),
  CONSTRAINT "scope_registry_id_check" CHECK (scope_id ~ '^[a-z][a-z0-9]{0,14}$'::text),
  CONSTRAINT "scope_registry_kind_check" CHECK (scope_kind = ANY (ARRAY['scope'::text, 'group'::text, 'system'::text])),
  CONSTRAINT "scope_registry_name_check" CHECK (btrim(display_name) <> ''::text),
  CONSTRAINT "scope_registry_no_repeated_domain_labels" CHECK (domain IS NULL OR NOT silver.domain_has_repeated_labels(domain)),
  CONSTRAINT "scope_registry_pkey" PRIMARY KEY (scope_id),
  CONSTRAINT "scope_registry_route_check" CHECK (domain IS NOT NULL AND btrim(domain) <> ''::text AND (directory IS NULL OR btrim(directory) = ''::text) OR directory IS NOT NULL AND btrim(directory) <> ''::text AND (domain IS NULL OR btrim(domain) = ''::text))
);

CREATE TABLE "silver"."scope_source_subcategories" (
  "scope_id" text NOT NULL,
  "source_key" text NOT NULL,
  "category_code" text NOT NULL,
  "display_name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scope_source_subcategories_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "scope_source_subcategories_pkey" PRIMARY KEY (scope_id, source_key),
  CONSTRAINT "scope_source_subcategories_source_key_check" CHECK (length(source_key) >= 1 AND length(source_key) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."statistics_source_aliases" (
  "source_key" text NOT NULL,
  "category_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "statistics_source_aliases_pkey" PRIMARY KEY (source_key),
  CONSTRAINT "statistics_source_aliases_source_key_check" CHECK (char_length(btrim(source_key)) >= 1 AND char_length(btrim(source_key)) <= 120 AND source_key = lower(btrim(source_key)))
);

CREATE TABLE "silver"."statistics_source_categories" (
  "category_code" text NOT NULL,
  "display_name" text NOT NULL,
  "sort_order" integer DEFAULT 100 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "statistics_source_categories_category_code_check" CHECK (category_code ~ '^[a-z][a-z0-9_-]{0,63}$'::text),
  CONSTRAINT "statistics_source_categories_display_name_check" CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 80),
  CONSTRAINT "statistics_source_categories_pkey" PRIMARY KEY (category_code)
);

ALTER TABLE "silver"."lo3rwang" ADD CONSTRAINT "lo3rwang_current_keyword_class_fk" FOREIGN KEY (current_keyword_class_id) REFERENCES silver.keyword_classes(class_id);

ALTER TABLE "silver"."lo3rwang_galaxy_media" ADD CONSTRAINT "lo3rwang_galaxy_media_galaxy_link_fkey" FOREIGN KEY (galaxy_link) REFERENCES silver.lo3rwang_galaxy(uid) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "silver"."lo3rwang_keywords" ADD CONSTRAINT "lo3rwang_keywords_class_fk" FOREIGN KEY (class_id) REFERENCES silver.keyword_classes(class_id);

ALTER TABLE "silver"."scope_group_source_sharing" ADD CONSTRAINT "scope_group_source_sharing_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "silver"."scope_group_source_sharing" ADD CONSTRAINT "scope_group_source_sharing_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."scope_other_sources" ADD CONSTRAINT "scope_other_sources_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."scope_registry" ADD CONSTRAINT "scope_registry_parent_fk" FOREIGN KEY (parent_scope_id) REFERENCES silver.scope_registry(scope_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "silver"."scope_source_subcategories" ADD CONSTRAINT "scope_source_subcategories_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code);

ALTER TABLE "silver"."scope_source_subcategories" ADD CONSTRAINT "scope_source_subcategories_scope_id_fkey" FOREIGN KEY (scope_id) REFERENCES silver.scope_registry(scope_id) ON DELETE CASCADE;

ALTER TABLE "silver"."statistics_source_aliases" ADD CONSTRAINT "statistics_source_aliases_category_code_fkey" FOREIGN KEY (category_code) REFERENCES silver.statistics_source_categories(category_code);

CREATE INDEX visual_novel_canon_idx ON silver."VisualNovel" USING btree (work_key, canon_status, is_current);

CREATE INDEX visual_novel_parent_idx ON silver."VisualNovel" USING btree (work_key, parent_key, sort_order);

CREATE INDEX visual_novel_reveal_idx ON silver."VisualNovel" USING btree (work_key, reveal_stage, part_no) WHERE (reveal_stage IS NOT NULL);

CREATE INDEX visual_novel_target_idx ON silver."VisualNovel" USING btree (work_key, target_key) WHERE (target_key IS NOT NULL);

CREATE INDEX visual_novel_work_type_idx ON silver."VisualNovel" USING btree (work_key, record_type, part_no, chapter_no, scene_no, sort_order);

CREATE UNIQUE INDEX database_targets_one_selected ON silver.database_targets USING btree (selected) WHERE selected;

CREATE UNIQUE INDEX game_asset_code_unique ON silver.game USING btree (asset_code) WHERE (record_type = 'asset'::text);

CREATE INDEX game_asset_kind_idx ON silver.game USING btree (asset_kind, sort_order) WHERE (record_type = 'asset'::text);

CREATE INDEX game_event_group_idx ON silver.game USING btree (event_group, sort_order) WHERE (record_type = 'event'::text);

CREATE UNIQUE INDEX game_event_id_unique ON silver.game USING btree (event_id) WHERE (record_type = 'event'::text);

CREATE UNIQUE INDEX game_macro_code_unique ON silver.game USING btree (macro_code) WHERE (record_type = 'macro'::text);

CREATE INDEX game_record_type_idx ON silver.game USING btree (record_type, sort_order);

CREATE INDEX game_role_group_idx ON silver.game USING btree (role_group) WHERE (record_type = 'role'::text);

CREATE UNIQUE INDEX game_role_id_unique ON silver.game USING btree (role_id) WHERE (record_type = 'role'::text);

CREATE UNIQUE INDEX game_rune_action_id_unique ON silver.game USING btree (rune_id) WHERE (record_type = 'rune_action'::text);

CREATE INDEX game_rune_id_idx ON silver.game USING btree (rune_id) WHERE (record_type = 'rune_action'::text);

CREATE INDEX lo3rwang_blocks_page_order_idx ON silver.lo3rwang_blocks USING btree (page_name, block_order);

CREATE INDEX idx_lo3rwang_galaxy_createtime ON silver.lo3rwang_galaxy USING btree (createtime);

CREATE INDEX idx_lo3rwang_galaxy_ref_id ON silver.lo3rwang_galaxy USING btree (ref_id) WHERE (ref_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_id ON silver.lo3rwang_galaxy USING btree (source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_name ON silver.lo3rwang_galaxy USING btree (source_name) WHERE (source_name IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_native ON silver.lo3rwang_galaxy USING btree (source_name, source_native_id) WHERE ((source_name IS NOT NULL) AND (source_native_id IS NOT NULL));

CREATE INDEX idx_lo3rwang_galaxy_statistics_time_source ON silver.lo3rwang_galaxy USING btree (createtime) INCLUDE (source_name) WHERE ((statistics_able = true) AND (content <> ''::text));

CREATE INDEX idx_lo3rwang_galaxy_target_id ON silver.lo3rwang_galaxy USING btree (target_id) WHERE (target_id IS NOT NULL);

CREATE UNIQUE INDEX lo3rwang_galaxy_uid_ci_uq ON silver.lo3rwang_galaxy USING btree (lower((uid)::text));

CREATE INDEX idx_lo3rwang_galaxy_media_createtime ON silver.lo3rwang_galaxy_media USING btree (createtime);

CREATE INDEX lo3rwang_galaxy_media_link_idx ON silver.lo3rwang_galaxy_media USING btree (galaxy_link);

CREATE UNIQUE INDEX lo3rwang_galaxy_media_url_uidx ON silver.lo3rwang_galaxy_media USING btree (url) WHERE (url IS NOT NULL);

CREATE INDEX lo3rwang_keywords_class_group_order_idx ON silver.lo3rwang_keywords USING btree (class_name, class_group, order_no, item_no);

CREATE INDEX lo3rwang_keywords_class_id_idx ON silver.lo3rwang_keywords USING btree (class_id, order_no, item_no);

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_name_idx ON silver.lo3rwang_keywords USING btree (class_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_no_idx ON silver.lo3rwang_keywords USING btree (class_name, item_no);

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_name_idx ON silver.lo3rwang_keywords USING btree (group_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_no_idx ON silver.lo3rwang_keywords USING btree (group_name, item_no);

CREATE INDEX lo3rwang_keywords_order_idx ON silver.lo3rwang_keywords USING btree (group_name, order_no, item_no);

CREATE INDEX lo3rwang_time_date_idx ON silver.lo3rwang_time USING btree (time_date);

CREATE INDEX lo3rwang_time_order_idx ON silver.lo3rwang_time USING btree (record_type, display_order);

CREATE INDEX lo3rwang_time_style_comment_lookup_idx ON silver.lo3rwang_time USING btree (record_type, label);

CREATE INDEX loc_blocks_page_order_idx ON silver.loc_blocks USING btree (page_name, block_order);

CREATE INDEX loc_search_keywords_scope_time_idx ON silver.loc_search_keywords USING btree (scope_id, searched_at DESC);

CREATE INDEX loc_search_keywords_searched_at_idx ON silver.loc_search_keywords USING btree (searched_at DESC);

CREATE INDEX lrunes_blocks_page_order_idx ON silver.lrunes_blocks USING btree (page_name, block_order);

CREATE INDEX idx_lrunes_galaxy_statistics_time_source ON silver.lrunes_galaxy USING btree (createtime) INCLUDE (source_name) WHERE ((statistics_able = true) AND (content <> ''::text));

CREATE INDEX lrunes_galaxy_createtime_idx ON silver.lrunes_galaxy USING btree (createtime);

CREATE UNIQUE INDEX lrunes_galaxy_lower_idx ON silver.lrunes_galaxy USING btree (lower((uid)::text));

CREATE INDEX lrunes_galaxy_ref_id_idx ON silver.lrunes_galaxy USING btree (ref_id) WHERE (ref_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_source_id_idx ON silver.lrunes_galaxy USING btree (source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_source_name_idx ON silver.lrunes_galaxy USING btree (source_name) WHERE (source_name IS NOT NULL);

CREATE INDEX lrunes_galaxy_target_id_idx ON silver.lrunes_galaxy USING btree (target_id) WHERE (target_id IS NOT NULL);

CREATE INDEX lrunes_galaxy_media_create_time_idx ON silver.lrunes_galaxy_media USING btree (createtime);

CREATE INDEX lrunes_galaxy_media_galaxy_link_idx ON silver.lrunes_galaxy_media USING btree (galaxy_link);

CREATE UNIQUE INDEX lrunes_galaxy_media_url_idx ON silver.lrunes_galaxy_media USING btree (url) WHERE (url IS NOT NULL);

CREATE INDEX lrunes_time_date_idx ON silver.lrunes_time USING btree (time_date);

CREATE INDEX lrunes_time_order_idx ON silver.lrunes_time USING btree (record_type, display_order);

CREATE INDEX lrunes_time_style_comment_lookup_idx ON silver.lrunes_time USING btree (record_type, label);

CREATE INDEX manage_email_lower_idx ON silver.manage USING btree (lower(email));

CREATE INDEX scope_other_sources_scope_idx ON silver.scope_other_sources USING btree (scope_id);

CREATE UNIQUE INDEX scope_registry_directory_unique ON silver.scope_registry USING btree (lower(directory)) WHERE ((directory IS NOT NULL) AND (btrim(directory) <> ''::text));

CREATE UNIQUE INDEX scope_registry_domain_unique ON silver.scope_registry USING btree (lower(domain)) WHERE ((domain IS NOT NULL) AND (btrim(domain) <> ''::text));

CREATE UNIQUE INDEX scope_registry_extra_sign_unique ON silver.scope_registry USING btree (extra_sign) WHERE (extra_sign IS NOT NULL);

CREATE INDEX scope_registry_parent_idx ON silver.scope_registry USING btree (parent_scope_id) WHERE (parent_scope_id IS NOT NULL);

CREATE UNIQUE INDEX scope_registry_unique_directory ON silver.scope_registry USING btree (lower(directory)) WHERE (directory IS NOT NULL);

CREATE UNIQUE INDEX scope_registry_unique_domain ON silver.scope_registry USING btree (lower(domain)) WHERE (domain IS NOT NULL);

CREATE INDEX scope_source_subcategories_parent_idx ON silver.scope_source_subcategories USING btree (category_code);

CREATE OR REPLACE FUNCTION silver.current_auth_email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
 SELECT lower(coalesce(api.request_claims()->>'email',''))
$function$
;

CREATE OR REPLACE FUNCTION silver.can_manage_global()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email() AND role='admin'
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.can_manage_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email()
    AND (role='admin' OR (role='scope' AND id=p_scope_id))
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.domain_has_repeated_labels(p_domain text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM unnest(string_to_array(lower(p_domain),'.')) label
    GROUP BY label HAVING count(*)>1
  );
$function$
;

CREATE OR REPLACE FUNCTION silver.registered_scope_extra_sign(p_scope_id text, p_scope_kind text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_owner_email text;
begin
  select lower(btrim(email)) into v_owner_email
    from silver.manage
   where id='lo3rwang' and role='admin'
   order by email limit 1;
  if coalesce(v_owner_email,'')='' then return null; end if;

  -- LOC is the canonical root Group. It has no separate manage/email row;
  -- the personal owner identity is established by the Author admin mapping.
  if p_scope_id='loc' and p_scope_kind='group' then return 'codex'; end if;

  -- Author/LunaRunes must belong to that exact registered owner at creation.
  if p_scope_kind='scope' and p_scope_id in ('lo3rwang','lrunes') and exists(
    select 1 from silver.manage m
     where m.id=p_scope_id
       and lower(btrim(m.email))=v_owner_email
       and m.role in ('admin','scope')
  ) then
    return case p_scope_id
      when 'lo3rwang' then 'anchor'
      when 'lrunes' then 'moon'
      else null
    end;
  end if;
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.management_write(p_table text, p_operation text, p_rows jsonb DEFAULT NULL::jsonb, p_values jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
declare
 v_rel regclass;
 v_allowed boolean := false;
 v_row jsonb;
 v_columns text;
 v_values_expr text;
 v_set_expr text;
 v_where text := '';
 v_filter jsonb;
 v_filter_col text;
 v_count integer := 0;
 v_affected integer := 0;
 v_scope_rows integer := 0;
 v_scope_id text := '';
 v_email text := '';
 v_scope record;
begin
 if coalesce(trim(p_table),'')='' then raise exception 'table is required'; end if;
 v_rel := to_regclass(p_table);
 if v_rel is null then raise exception 'unknown relation'; end if;

 if v_rel = 'silver.manage'::regclass then
   v_allowed := silver.can_manage_global();
 elsif v_rel = 'silver.loc_blocks'::regclass then
   v_allowed := silver.can_manage_global();
 else
   for v_scope in
     select distinct id,coalesce(nullif(galaxy,''),'galaxy') as galaxy,coalesce(nullif(time,''),'time') as time
     from silver.manage
   loop
     if not silver.can_manage_scope(v_scope.id) then continue; end if;
     if v_rel = to_regclass(format('silver.%I',v_scope.id))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy||'_media'))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.time))
       or v_rel = to_regclass(format('silver.%I',v_scope.id||'_blocks'))
     then
       v_allowed := true;
       exit;
     end if;
   end loop;
 end if;

 if not v_allowed then raise exception 'management permission denied'; end if;

 if p_operation='scope_sync' then
   if v_rel <> 'silver.manage'::regclass then raise exception 'scope_sync only supports silver.manage'; end if;
   if jsonb_typeof(p_values) <> 'object' then raise exception 'values must be an object'; end if;
   if jsonb_typeof(p_filters) <> 'array' then raise exception 'filters must be an array'; end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if v_filter->>'column'='id' then v_scope_id:=coalesce(v_filter->>'value',''); end if;
     if v_filter->>'column'='email' then v_email:=coalesce(v_filter->>'value',''); end if;
   end loop;
   if v_scope_id='' or v_email='' then raise exception 'scope_sync requires id and email'; end if;
   if not exists(select 1 from silver.manage where id=v_scope_id and lower(email)=lower(v_email)) then raise exception 'mapping row not found'; end if;
   update silver.manage
   set role=case when lower(email)=lower(v_email) and p_values ? 'role' then coalesce(nullif(p_values->>'role',''),role) else role end,
       galaxy=case when p_values ? 'galaxy' then coalesce(nullif(p_values->>'galaxy',''),galaxy) else galaxy end,
       time=case when p_values ? 'time' then coalesce(nullif(p_values->>'time',''),time) else time end,
       birthday=case when p_values ? 'birthday' then nullif(p_values->>'birthday','')::date else birthday end
   where id=v_scope_id;
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);

 elsif p_operation='insert' then
   if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be an array'; end if;
   if jsonb_array_length(p_rows)=0 then return jsonb_build_object('count',0); end if;
   for v_row in select value from jsonb_array_elements(p_rows) loop
     select string_agg(quote_ident(k.key),',' order by k.key),
            string_agg(format('((jsonb_populate_record(NULL::%s,$1)).%I)',v_rel::text,k.key),',' order by k.key)
     into v_columns,v_values_expr
     from jsonb_object_keys(v_row) as k(key)
     join pg_attribute a on a.attrelid=v_rel and a.attname=k.key and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='';
     if coalesce(v_columns,'')='' then raise exception 'no writable columns'; end if;
     execute format('insert into %s (%s) values (%s)',v_rel::text,v_columns,v_values_expr) using v_row;
     v_count := v_count + 1;
   end loop;
   return jsonb_build_object('count',v_count);

 elsif p_operation='update' then
   if jsonb_typeof(p_values) <> 'object' then raise exception 'values must be an object'; end if;
   if jsonb_typeof(p_filters) <> 'array' or jsonb_array_length(p_filters)=0 then raise exception 'filters are required'; end if;
   if exists (
     select 1 from jsonb_object_keys(p_values) k(key)
     join pg_index i on i.indrelid=v_rel and i.indisprimary
     join pg_attribute a on a.attrelid=v_rel and a.attnum = any(i.indkey)
     where a.attname=k.key
   ) then raise exception 'primary key update is not allowed'; end if;
   select string_agg(format('%I=((jsonb_populate_record(NULL::%s,$1)).%I)',k.key,v_rel::text,k.key),',' order by k.key)
   into v_set_expr
   from jsonb_object_keys(p_values) as k(key)
   join pg_attribute a on a.attrelid=v_rel and a.attname=k.key and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='';
   if coalesce(v_set_expr,'')='' then raise exception 'no writable columns'; end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if coalesce(v_filter->>'operator','eq') <> 'eq' then raise exception 'only eq filters are supported'; end if;
     v_filter_col := v_filter->>'column';
     if not exists(select 1 from pg_attribute where attrelid=v_rel and attname=v_filter_col and attnum>0 and not attisdropped) then raise exception 'invalid filter column'; end if;
     if v_where<>'' then v_where := v_where||' and '; end if;
     v_where := v_where||format('%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
       v_filter_col,v_rel::text,jsonb_build_object(v_filter_col,v_filter->'value')::text,v_filter_col);
   end loop;
   execute format('update %s set %s where %s',v_rel::text,v_set_expr,v_where) using p_values;
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);

 elsif p_operation='delete' then
   if jsonb_typeof(p_filters) <> 'array' or jsonb_array_length(p_filters)=0 then raise exception 'filters are required'; end if;
   if v_rel='silver.manage'::regclass then
     for v_filter in select value from jsonb_array_elements(p_filters) loop
       if v_filter->>'column'='id' then v_scope_id:=coalesce(v_filter->>'value',''); end if;
       if v_filter->>'column'='email' then v_email:=coalesce(v_filter->>'value',''); end if;
     end loop;
     if v_scope_id<>'' and v_email<>'' and exists(select 1 from silver.manage where id=v_scope_id and lower(email)=lower(v_email)) then
       select count(*) into v_scope_rows from silver.manage where id=v_scope_id;
       if v_scope_rows<=1 then raise exception 'cannot remove the final Scope registry row'; end if;
     end if;
   end if;
   for v_filter in select value from jsonb_array_elements(p_filters) loop
     if coalesce(v_filter->>'operator','eq') <> 'eq' then raise exception 'only eq filters are supported'; end if;
     v_filter_col := v_filter->>'column';
     if not exists(select 1 from pg_attribute where attrelid=v_rel and attname=v_filter_col and attnum>0 and not attisdropped) then raise exception 'invalid filter column'; end if;
     if v_where<>'' then v_where := v_where||' and '; end if;
     v_where := v_where||format('%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
       v_filter_col,v_rel::text,jsonb_build_object(v_filter_col,v_filter->'value')::text,v_filter_col);
   end loop;
   execute format('delete from %s where %s',v_rel::text,v_where);
   get diagnostics v_affected = row_count;
   return jsonb_build_object('count',v_affected);
 else
   raise exception 'unsupported operation';
 end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_mode text := lower(coalesce(p_rows->>'mode',''));
  v_rows jsonb := p_rows->'rows';
  v_meta jsonb := coalesce(p_rows->'meta','{}'::jsonb);
  v_config regclass;
  v_galaxy regclass;
  v_galaxy_suffix text;
  v_affected integer := 0;
  v_document_count integer := 0;
  v_expected integer := 0;
  v_meta_class_id text := '';
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  select coalesce(nullif(galaxy,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope order by case when role='admin' then 0 else 1 end,email limit 1;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    -- PostgreSQL safe-update requires a WHERE clause. Avoid touching already cleared rows.
    execute format('update %s set class_id=null,group_lists=''false''::jsonb where class_id is not null or group_lists is distinct from ''false''::jsonb',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_document_count=0,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select upper(btrim(x.uid))::character(8) as uid,x.class_id,coalesce(x.group_lists,''{}''::jsonb) as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists jsonb)
         where btrim(coalesce(x.uid,'''')) <> ''''
       )
       update %s as g set class_id=p.class_id,group_lists=p.group_lists from payload p where g.uid=p.uid',
      v_galaxy
    ) using v_rows;
    get diagnostics v_affected = row_count;
    if v_affected<>v_expected then raise exception 'keyword classification chunk incomplete: expected %, affected %',v_expected,v_affected; end if;
    return v_affected;
  end if;

  if v_mode='finalize' then
    v_meta_class_id := coalesce(v_meta->>'class_id','');
    if v_meta_class_id='' then raise exception 'classification metadata class_id is required'; end if;
    execute format('select count(*) from %s where id=$1 and current_keyword_class_id::text=$2',v_config)
      into v_expected using v_scope,v_meta_class_id;
    if v_expected<>1 then raise exception 'current keyword Class changed before finalize'; end if;
    execute format('select count(*) from %s where group_lists<>''false''::jsonb',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_document_count=$2,keyword_meta=$3,updated_at=now() where id=$1',v_config)
      using v_scope,v_document_count,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$
;

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_rows jsonb)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select api.apply_keyword_classification('lo3rwang',p_rows)
$function$
;

CREATE OR REPLACE FUNCTION api.copy_rune66_keyword_class(p_scope_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_source_class uuid;
  v_copy_id uuid := gen_random_uuid();
  v_class_name text;
  v_target regclass;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.scope_registry WHERE scope_id=v_scope AND scope_kind='scope')
    THEN RAISE EXCEPTION 'Scope does not exist'; END IF;
  v_target := to_regclass(format('silver.%I',v_scope||'_keywords'));
  IF v_target IS NULL THEN RAISE EXCEPTION 'Scope keyword table does not exist'; END IF;
  SELECT current_keyword_class_id INTO v_source_class FROM silver.lo3rwang WHERE id='lo3rwang';
  IF v_source_class IS NULL THEN RAISE EXCEPTION 'Source Rune66 Class is not configured'; END IF;
  SELECT count(*) INTO v_count FROM silver.lo3rwang_keywords WHERE class_id=v_source_class;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy requires exactly 66 source entries; got %',v_count; END IF;

  v_class_name := '符文66副本-'||replace(v_copy_id::text,'-','');
  INSERT INTO silver.keyword_classes(class_id,scope_id) VALUES(v_copy_id,v_scope);
  EXECUTE format(
    'INSERT INTO %s(class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
     SELECT $1,$2,item_no,item_name,principle,keywords,order_no,$2,class_group,class_enable
     FROM silver.lo3rwang_keywords WHERE class_id=$3 ORDER BY order_no,item_no',
    v_target
  ) USING v_copy_id,v_class_name,v_source_class;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy wrote % instead of 66 entries',v_count; END IF;
  RETURN jsonb_build_object('class_id',v_copy_id,'class_name',v_class_name,'count',v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.delete_scope(p_scope_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_kind text;
  v_suffix text;
  v_relation text;
BEGIN
  IF NOT silver.can_manage_global() THEN RAISE EXCEPTION 'Global Admin permission required'; END IF;
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF v_scope IN ('loc','lrunes','lo3rwang','admin') THEN RAISE EXCEPTION 'Cannot delete a built-in Scope'; END IF;
  SELECT scope_kind INTO v_kind FROM silver.scope_registry WHERE scope_id=v_scope FOR UPDATE;
  IF NOT FOUND OR v_kind<>'scope' THEN RAISE EXCEPTION 'Only an existing non-system Scope may be deleted'; END IF;
  IF EXISTS(SELECT 1 FROM silver.scope_registry WHERE parent_scope_id=v_scope)
    THEN RAISE EXCEPTION 'Scope has child Registry entries'; END IF;
  FOREACH v_suffix IN ARRAY ARRAY['_galaxy_media','_galaxy','_time','_keywords','_blocks',''] LOOP
    v_relation := format('silver.%I',v_scope||v_suffix);
    IF to_regclass(v_relation) IS NULL THEN RAISE EXCEPTION 'Expected Scope table % is missing',v_relation; END IF;
    EXECUTE 'DROP TABLE '||v_relation||' RESTRICT';
  END LOOP;
  DELETE FROM silver.keyword_classes WHERE scope_id=v_scope;
  DELETE FROM silver.manage WHERE id=v_scope;
  DELETE FROM silver.scope_registry WHERE scope_id=v_scope;
  RETURN jsonb_build_object('scope_id',v_scope,'deleted',true);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.log_search_keyword(p_scope_id text, p_query_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_query text := btrim(coalesce(p_query_text,''));
begin
  if v_query = '' then
    return;
  end if;

  if char_length(v_query) > 200 then
    v_query := left(v_query,200);
  end if;

  if v_scope <> 'loc' and not exists (
    select 1 from silver.manage where id = v_scope
  ) then
    return;
  end if;

  delete from silver.loc_search_keywords
  where searched_at < now() - interval '7 days';

  insert into silver.loc_search_keywords(scope_id,query_text)
  values (v_scope,v_query);
end;
$function$
;

CREATE OR REPLACE FUNCTION api.manage_scope_registry(p_operation text, p_scope_id text, p_values jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operation text := lower(btrim(coalesce(p_operation,'')));
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_values jsonb := coalesce(p_values,'{}'::jsonb);
  v_current silver.scope_registry%rowtype;
  v_name text;
  v_domain text;
  v_directory text;
  v_parent text;
  v_active boolean;
  v_sort integer;
  v_cycle boolean := false;
begin
  if not silver.can_manage_global() then
    raise exception 'global management permission denied';
  end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then
    raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter';
  end if;
  if jsonb_typeof(v_values) <> 'object' then
    raise exception 'values must be an object';
  end if;

  if v_operation='create_group' then
    if exists(select 1 from silver.scope_registry where scope_id=v_scope) then
      raise exception 'Scope registry ID already exists';
    end if;

    v_name := btrim(coalesce(v_values->>'display_name',''));
    v_domain := lower(btrim(coalesce(v_values->>'domain','')));
    v_directory := lower(btrim(coalesce(v_values->>'directory','')));
    v_parent := lower(btrim(coalesce(v_values->>'parent_scope_id','loc')));
    v_active := coalesce((v_values->>'active')::boolean,true);

    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then
      raise exception 'exactly one of domain or directory is required';
    end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then
      raise exception 'domain format is invalid';
    end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then
        raise exception 'directory format is invalid';
      end if;
    end if;
    if not exists(
      select 1 from silver.scope_registry
      where scope_id=v_parent and scope_kind='group' and active
    ) then
      raise exception 'parent Scope Group does not exist or is inactive';
    end if;
    if v_values ? 'sort_order' then
      v_sort := coalesce((v_values->>'sort_order')::integer,0);
    else
      select coalesce(max(sort_order),0)+10 into v_sort
      from silver.scope_registry where parent_scope_id=v_parent;
    end if;

    insert into silver.scope_registry(
      scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order
    ) values(
      v_scope,v_name,'group',nullif(v_domain,''),nullif(v_directory,''),v_parent,v_active,v_sort
    )
    returning * into v_current;

  elsif v_operation='update' then
    select * into v_current from silver.scope_registry where scope_id=v_scope;
    if not found then raise exception 'Scope registry row not found'; end if;
    if v_current.scope_kind='system' then
      raise exception 'system registry rows are immutable';
    end if;

    v_name := case when v_values ? 'display_name'
      then btrim(coalesce(v_values->>'display_name',''))
      else v_current.display_name end;
    v_domain := case when v_values ? 'domain'
      then lower(btrim(coalesce(v_values->>'domain','')))
      else coalesce(v_current.domain,'') end;
    v_directory := case when v_values ? 'directory'
      then lower(btrim(coalesce(v_values->>'directory','')))
      else coalesce(v_current.directory,'') end;
    v_parent := case when v_values ? 'parent_scope_id'
      then lower(btrim(coalesce(v_values->>'parent_scope_id','')))
      else coalesce(v_current.parent_scope_id,'') end;
    v_active := case when v_values ? 'active'
      then coalesce((v_values->>'active')::boolean,false)
      else v_current.active end;
    v_sort := case when v_values ? 'sort_order'
      then coalesce((v_values->>'sort_order')::integer,0)
      else v_current.sort_order end;

    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then
      raise exception 'exactly one of domain or directory is required';
    end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then
      raise exception 'domain format is invalid';
    end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then
        raise exception 'directory format is invalid';
      end if;
    end if;

    if v_scope='loc' then
      if v_parent<>'' then raise exception 'root LOC group cannot have a parent'; end if;
      if not v_active then raise exception 'root LOC group cannot be disabled'; end if;
    else
      if v_parent='' then raise exception 'non-root registry rows require a parent Scope Group'; end if;
      if v_parent=v_scope then raise exception 'Scope cannot parent itself'; end if;
      if not exists(
        select 1 from silver.scope_registry
        where scope_id=v_parent and scope_kind='group' and active
      ) then
        raise exception 'parent Scope Group does not exist or is inactive';
      end if;
    end if;

    if v_current.scope_kind='group' and v_parent<>'' then
      with recursive ancestors(scope_id,parent_scope_id) as (
        select r.scope_id,r.parent_scope_id
        from silver.scope_registry r where r.scope_id=v_parent
        union all
        select r.scope_id,r.parent_scope_id
        from silver.scope_registry r
        join ancestors a on r.scope_id=a.parent_scope_id
        where a.parent_scope_id is not null
      )
      select exists(select 1 from ancestors where scope_id=v_scope) into v_cycle;
      if v_cycle then raise exception 'Scope Group parent would create a cycle'; end if;
    end if;

    if v_current.scope_kind='group' and not v_active and exists(
      select 1 from silver.scope_registry where parent_scope_id=v_scope and active
    ) then
      raise exception 'move or disable active child Scopes before disabling this Group';
    end if;

    update silver.scope_registry
    set display_name=v_name,
        domain=nullif(v_domain,''),
        directory=nullif(v_directory,''),
        parent_scope_id=nullif(v_parent,''),
        active=v_active,
        sort_order=v_sort,
        updated_at=now()
    where scope_id=v_scope
    returning * into v_current;
  else
    raise exception 'unsupported Scope Registry operation';
  end if;

  return jsonb_build_object(
    'scope_id',v_current.scope_id,
    'display_name',v_current.display_name,
    'scope_kind',v_current.scope_kind,
    'domain',v_current.domain,
    'directory',v_current.directory,
    'parent_scope_id',v_current.parent_scope_id,
    'active',v_current.active,
    'sort_order',v_current.sort_order
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION api.move_scope_block(p_scope_id text, p_page_name text, p_uid text, p_direction integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_page text := lower(btrim(coalesce(p_page_name,'')));
  v_uid text := btrim(coalesce(p_uid,''));
  v_table regclass;
  v_order integer;
  v_neighbor_uid text;
  v_neighbor_order integer;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope ID'; END IF;
  IF v_page='' OR length(v_page)>80 THEN RAISE EXCEPTION 'Invalid page name'; END IF;
  IF v_uid !~ '^[A-Za-z0-9]{8}$' THEN RAISE EXCEPTION 'Invalid block UID'; END IF;
  IF p_direction NOT IN (-1,1) OR p_direction IS NULL THEN RAISE EXCEPTION 'Direction must be -1 or 1'; END IF;
  IF NOT (
    CASE WHEN v_scope='loc' THEN silver.can_manage_global()
    ELSE silver.can_manage_scope(v_scope) END
  ) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  v_table := to_regclass(format('silver.%I',v_scope||'_blocks'));
  IF v_table IS NULL THEN RAISE EXCEPTION 'Scope Blocks table not found'; END IF;
  -- Serialise swaps of any two blocks on the same page.
  PERFORM pg_advisory_xact_lock(hashtext(v_scope),hashtext(v_page));
  EXECUTE format('SELECT block_order FROM %s WHERE uid=$1 AND page_name=$2',v_table)
    INTO v_order USING v_uid,v_page;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Block not found on requested page'; END IF;
  IF p_direction=-1 THEN
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order<$2 ORDER BY block_order DESC,uid DESC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  ELSE
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order>$2 ORDER BY block_order ASC,uid ASC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  END IF;
  IF v_neighbor_uid IS NULL THEN RAISE EXCEPTION 'Block is already at page boundary'; END IF;
  EXECUTE format('UPDATE %s SET block_order=CASE WHEN uid=$1 THEN $3 ELSE $4 END
                  WHERE page_name=$5 AND uid IN ($1,$2)',v_table)
    USING v_uid,v_neighbor_uid,v_neighbor_order,v_order,v_page;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>2 THEN RAISE EXCEPTION 'Block reorder incomplete: % rows',v_count; END IF;
  RETURN jsonb_build_object('uid',v_uid,'block_order',v_neighbor_order,'neighbor_uid',v_neighbor_uid,'neighbor_order',v_order);
END;
$function$
;

CREATE OR REPLACE FUNCTION api.provision_scope(p_scope_id text, p_display_name text, p_email text, p_birthday date DEFAULT NULL::date, p_domain text DEFAULT NULL::text, p_directory text DEFAULT NULL::text, p_parent_scope_id text DEFAULT 'loc'::text, p_theme text DEFAULT 'system-default'::text, p_copy_keywords boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_name text := btrim(coalesce(p_display_name,''));
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_directory text := lower(btrim(coalesce(p_directory,'')));
  v_parent text := lower(btrim(coalesce(p_parent_scope_id,'loc')));
  v_theme text := lower(btrim(coalesce(p_theme,'system-default')));
  v_config_name text;
  v_galaxy_name text;
  v_media_name text;
  v_time_name text;
  v_keywords_name text;
  v_blocks_name text;
  v_source_class uuid;
  v_new_class uuid;
  v_keyword_count integer := 0;
  v_keyword_sequence text;
  v_sort_order integer := 0;
begin
  if not silver.can_manage_global() then raise exception 'global management permission denied'; end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter'; end if;
  if v_name='' then raise exception 'display name is required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email format is invalid'; end if;
  if v_theme<>'system-default' and v_theme !~ '^theme-[1-8]$' then raise exception 'theme must be theme-1 through theme-8'; end if;
  if (v_domain='') = (v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
  if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
  if v_directory<>'' then
    v_directory := '/'||btrim(v_directory,'/');
    if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
  end if;
  if v_parent='' then v_parent := 'loc'; end if;
  if not exists(select 1 from silver.scope_registry where scope_id=v_parent and scope_kind='group' and active)
  then raise exception 'parent Scope Group does not exist or is inactive'; end if;
  if exists(select 1 from silver.scope_registry where scope_id=v_scope) or exists(select 1 from silver.manage where id=v_scope)
  then raise exception 'Scope already exists'; end if;
  if v_domain<>'' and exists(select 1 from silver.scope_registry where lower(domain)=v_domain)
  then raise exception 'domain already belongs to another Scope'; end if;
  if v_directory<>'' and exists(select 1 from silver.scope_registry where lower(directory)=v_directory)
  then raise exception 'directory already belongs to another Scope'; end if;

  v_config_name := v_scope;
  v_galaxy_name := v_scope||'_galaxy';
  v_media_name := v_scope||'_galaxy_media';
  v_time_name := v_scope||'_time';
  v_keywords_name := v_scope||'_keywords';
  v_blocks_name := v_scope||'_blocks';

  if to_regclass(format('silver.%I',v_config_name)) is not null
    or to_regclass(format('silver.%I',v_galaxy_name)) is not null
    or to_regclass(format('silver.%I',v_media_name)) is not null
    or to_regclass(format('silver.%I',v_time_name)) is not null
    or to_regclass(format('silver.%I',v_keywords_name)) is not null
    or to_regclass(format('silver.%I',v_blocks_name)) is not null
  then raise exception 'one or more Scope relations already exist'; end if;

  execute format('create table silver.%I (like silver.lo3rwang including all)',v_config_name);
  execute format('create trigger sync_scope_display_name after insert or update of display_name on silver.%I for each row execute function silver.sync_scope_config_display_name()',v_config_name);
  execute format('alter table silver.%I drop column if exists home_blocks',v_config_name);
  execute format('alter table silver.%I drop column if exists governance_blocks',v_config_name);
  -- Canonical source of truth: do not repeat a separate Blocks schema here.
  -- LIKE INCLUDING ALL copies fields, UID defaults, validation and page/order indexes.
  execute format('create table silver.%I (like silver.lo3rwang_blocks including all)',v_blocks_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy including all)',v_galaxy_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy_media including all)',v_media_name);
  execute format('create table silver.%I (like silver.lo3rwang_time including all)',v_time_name);
  execute format('create table silver.%I (like silver.lo3rwang_keywords including all)',v_keywords_name);

  execute format('alter table silver.%I add constraint %I foreign key (galaxy_link) references silver.%I(uid)',v_media_name,v_scope||'_galaxy_media_galaxy_link_fk',v_galaxy_name);
  execute format('alter table silver.%I add constraint %I foreign key (current_keyword_class_id) references silver.keyword_classes(class_id)',v_config_name,v_scope||'_current_keyword_class_fk');
  execute format('alter table silver.%I add constraint %I foreign key (class_id) references silver.keyword_classes(class_id)',v_keywords_name,v_scope||'_keywords_class_fk');

  execute format('alter table silver.%I enable row level security',v_config_name);
  execute format('alter table silver.%I enable row level security',v_galaxy_name);
  execute format('alter table silver.%I enable row level security',v_media_name);
  execute format('alter table silver.%I enable row level security',v_time_name);
  execute format('alter table silver.%I enable row level security',v_keywords_name);
  execute format('alter table silver.%I enable row level security',v_blocks_name);

  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_config_public_read',v_config_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_config_scope_update',v_config_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_galaxy_public_read',v_galaxy_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_galaxy_scope_update',v_galaxy_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_media_public_read',v_media_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_media_scope_update',v_media_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_time_public_read',v_time_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_time_scope_all',v_time_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_keywords_scope_all',v_keywords_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_blocks_public_read',v_blocks_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_blocks_scope_all',v_blocks_name,v_scope,v_scope);

  execute format('grant select on silver.%I to anonymous,authenticated',v_config_name);
  execute format('grant update on silver.%I to authenticated',v_config_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_galaxy_name);
  execute format('grant update on silver.%I to authenticated',v_galaxy_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_media_name);
  execute format('grant update on silver.%I to authenticated',v_media_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_time_name);
  execute format('grant select,insert,update,delete on silver.%I to authenticated',v_keywords_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_blocks_name);
  execute format('grant insert,update,delete on silver.%I to authenticated',v_blocks_name);
  v_keyword_sequence := pg_get_serial_sequence(format('silver.%I',v_keywords_name),'keyword_id');
  if v_keyword_sequence is not null then execute format('grant usage,select on sequence %s to authenticated',v_keyword_sequence); end if;

  insert into silver.manage(id,email,role,galaxy,time,birthday)
  values(v_scope,v_email,'scope','galaxy','time',p_birthday);

  select coalesce(max(sort_order),0)+10 into v_sort_order from silver.scope_registry where parent_scope_id=v_parent;
  insert into silver.scope_registry(scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
  values(v_scope,v_name,'scope',nullif(v_domain,''),nullif(v_directory,''),v_parent,true,v_sort_order);

  if p_copy_keywords then
    select current_keyword_class_id into v_source_class from silver.lo3rwang where id='lo3rwang';
    if v_source_class is null then raise exception 'lo3rwang current Keyword Class is not configured'; end if;
    v_new_class := gen_random_uuid();
    insert into silver.keyword_classes(class_id,scope_id) values(v_new_class,v_scope);
    execute format(
      'insert into silver.%I
        (class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
       select $1,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable
       from silver.lo3rwang_keywords where class_id=$2 order by order_no,item_no',
      v_keywords_name
    ) using v_new_class,v_source_class;
    get diagnostics v_keyword_count = row_count;
    if v_keyword_count<>66 then raise exception 'Rune66 default copy expected 66 rows, copied %',v_keyword_count; end if;
  end if;

  execute format(
    'insert into silver.%I
      (id,email,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able,
       keyword_min_chars,keyword_min_documents,current_keyword_class_id,
       keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime,updated_at)
     values($1,$2,$3,'''',array[$1,$3]::text[],$4,''zh-Hant'',true,true,true,32,100,$5,false,0,''{}''::jsonb,null,now())',
    v_config_name
  ) using v_scope,v_email,v_name,v_theme,v_new_class;

  -- New Scopes start with no content rows. Editors add index/governance
  -- text frames only when authored; avoid empty default frames and legacy pages.

  -- PostgREST schema cache must see the six new relations after this transaction commits.
  perform pg_catalog.pg_notify('pgrst','reload schema');

  return jsonb_build_object(
    'scope_id',v_scope,'display_name',v_name,'parent_scope_id',v_parent,
    'route_mode',case when v_domain<>'' then 'domain' else 'directory' end,
    'route_value',case when v_domain<>'' then v_domain else v_directory end,
    'keyword_rows',v_keyword_count,'keyword_class_id',v_new_class
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION api.read_keyword_class(p_scope_id text, p_class_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_config regclass;
  v_keywords regclass;
  v_share boolean := false;
  v_allowed boolean := false;
  v_result jsonb := '[]'::jsonb;
begin
  if v_scope !~ '^[a-z][a-z0-9]*$' then
    return null;
  end if;

  if not exists(
    select 1
    from silver.keyword_classes
    where class_id=p_class_id and scope_id=v_scope
  ) then
    return null;
  end if;

  v_config := to_regclass(format('silver.%I',v_scope));
  v_keywords := to_regclass(format('silver.%I_keywords',v_scope));
  if v_config is null or v_keywords is null then
    return null;
  end if;

  v_allowed := silver.can_manage_scope(v_scope);
  if not v_allowed then
    begin
      execute format(
        'select coalesce(keyword_class_share_enabled,false) from %s where id=$1',
        v_config
      )
      into v_share
      using v_scope;
    exception when undefined_column then
      v_share := false;
    end;
    v_allowed := v_share;
  end if;

  if not v_allowed then
    return null;
  end if;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(k) order by k.order_no,k.item_no),''[]''::jsonb) from %s k where k.class_id=$1',
    v_keywords
  )
  into v_result
  using p_class_id;

  return coalesce(v_result,'[]'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.is_current_email_blocklisted()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM silver.email_blocklist
    WHERE email = silver.current_auth_email()
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.read_scope_page_copy(p_scope_id text)
 RETURNS TABLE("Title_TW" text, "Desc_TW" text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT nullif(btrim(m."Title_TW"),''), nullif(btrim(m."Desc_TW"),'')
  FROM silver.manage AS m
  JOIN silver.scope_registry AS r
    ON r.scope_id=m.id AND r.scope_kind='scope' AND r.active IS TRUE
  WHERE m.id=lower(btrim(p_scope_id))
    AND lower(btrim(p_scope_id)) ~ '^[a-z][a-z0-9]{0,14}$'
  ORDER BY m.email
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION silver.normalize_galaxy_content_validity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 BEGIN
 IF NEW.content IS NULL OR btrim(NEW.content)='' THEN
 NEW.content := NULL;
 NEW.searchable := false;
 END IF;
 RETURN NEW;
 END;
 $function$
;

CREATE OR REPLACE FUNCTION silver.set_scope_extra_sign_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.extra_sign := silver.registered_scope_extra_sign(new.scope_id,new.scope_kind);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.sync_scope_config_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_TABLE_SCHEMA <> 'silver' OR NEW.id IS DISTINCT FROM TG_TABLE_NAME
     OR btrim(coalesce(NEW.display_name,''))='' THEN
    RAISE EXCEPTION 'Invalid Scope display_name sync target';
  END IF;
  UPDATE silver.scope_registry
     SET display_name=btrim(NEW.display_name),updated_at=now()
   WHERE scope_id=NEW.id AND scope_kind='scope'
     AND display_name IS DISTINCT FROM btrim(NEW.display_name);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION silver.touch_visual_novel_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'silver'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION silver.management_write(p_table text, p_operation text, p_rows jsonb DEFAULT NULL::jsonb, p_values jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.management_write(p_table,p_operation,p_rows,p_values,p_filters)
$function$
;

CREATE OR REPLACE FUNCTION silver.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.apply_keyword_classification(p_scope_id,p_rows)
$function$
;

CREATE OR REPLACE FUNCTION silver.copy_rune66_keyword_class(p_scope_id text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.copy_rune66_keyword_class(p_scope_id) $function$
;

CREATE OR REPLACE FUNCTION silver.delete_scope(p_scope_id text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.delete_scope(p_scope_id) $function$
;

CREATE OR REPLACE FUNCTION silver.log_search_keyword(p_scope_id text, p_query_text text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.log_search_keyword(p_scope_id,p_query_text)
$function$
;

CREATE OR REPLACE FUNCTION silver.manage_scope_registry(p_operation text, p_scope_id text, p_values jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.manage_scope_registry(p_operation,p_scope_id,p_values)
$function$
;

CREATE OR REPLACE FUNCTION silver.move_scope_block(p_scope_id text, p_page_name text, p_uid text, p_direction integer)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ SELECT api.move_scope_block(p_scope_id,p_page_name,p_uid,p_direction) $function$
;

CREATE OR REPLACE FUNCTION silver.provision_scope(p_scope_id text, p_display_name text, p_email text, p_birthday date DEFAULT NULL::date, p_domain text DEFAULT NULL::text, p_directory text DEFAULT NULL::text, p_parent_scope_id text DEFAULT 'loc'::text, p_theme text DEFAULT 'theme-7'::text, p_copy_keywords boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.provision_scope(
    p_scope_id,p_display_name,p_email,p_birthday,p_domain,p_directory,
    p_parent_scope_id,p_theme,p_copy_keywords
  )
$function$
;

CREATE OR REPLACE FUNCTION silver.read_keyword_class(p_scope_id text, p_class_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select api.read_keyword_class(p_scope_id,p_class_id)
$function$
;

CREATE VIEW "api"."lo3rwang_keywords_manage" WITH (security_invoker=true,check_option=local) AS  SELECT keyword_id,
    class_id,
    group_name,
    item_no,
    item_name,
    principle,
    keywords,
    order_no,
    class_name,
    class_group,
    class_enable
   FROM silver.lo3rwang_keywords
  WHERE silver.can_manage_scope('lo3rwang'::text);

CREATE TRIGGER visual_novel_touch_updated_at BEFORE UPDATE ON silver."VisualNovel" FOR EACH ROW EXECUTE FUNCTION silver.touch_visual_novel_updated_at();

CREATE TRIGGER sync_scope_display_name AFTER INSERT OR UPDATE OF display_name ON silver.lo3rwang FOR EACH ROW EXECUTE FUNCTION silver.sync_scope_config_display_name();

CREATE TRIGGER lo3rwang_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lo3rwang_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER sync_scope_display_name AFTER INSERT OR UPDATE OF display_name ON silver.lrunes FOR EACH ROW EXECUTE FUNCTION silver.sync_scope_config_display_name();

CREATE TRIGGER lrunes_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lrunes_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER scope_registry_register_extra_sign BEFORE INSERT ON silver.scope_registry FOR EACH ROW EXECUTE FUNCTION silver.set_scope_extra_sign_on_insert();

ALTER TABLE "api"."user_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "api"."user_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."VisualNovel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."database_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."email_blocklist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."game" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."keyword_classes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_time" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_search_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."loc_theme" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_daily" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_time" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."manage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes_etc" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes_group" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_group_source_sharing" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_other_sources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_registry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."scope_source_subcategories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."statistics_source_aliases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."statistics_source_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_records_owner_all" ON "api"."user_records" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "user_settings_owner_all" ON "api"."user_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "database_targets_admin_all" ON "silver"."database_targets" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "email_blocklist_admin_add" ON "silver"."email_blocklist" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((silver.can_manage_global() AND (email <> silver.current_auth_email())));

CREATE POLICY "email_blocklist_admin_read" ON "silver"."email_blocklist" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_global());

CREATE POLICY "email_blocklist_admin_remove" ON "silver"."email_blocklist" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_global());

CREATE POLICY "game_public_read" ON "silver"."game" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "game_scope_delete" ON "silver"."game" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "game_scope_insert" ON "silver"."game" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "game_scope_update" ON "silver"."game" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "keyword_classes_scope_delete" ON "silver"."keyword_classes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_insert" ON "silver"."keyword_classes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_select" ON "silver"."keyword_classes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "lo3rwang_public_read" ON "silver"."lo3rwang" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_scope_update" ON "silver"."lo3rwang" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_blocks_public_read" ON "silver"."lo3rwang_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_blocks_scope_write" ON "silver"."lo3rwang_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_authenticated_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((searchable IS TRUE) OR silver.can_manage_scope('lo3rwang'::text)));

CREATE POLICY "lo3rwang_galaxy_public_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous" USING ((searchable IS TRUE));

CREATE POLICY "lo3rwang_galaxy_scope_update" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_media_public_read" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_media_scope_update" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_keywords_scope_all" ON "silver"."lo3rwang_keywords" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_public_read" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_time_scope_delete" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_scope_insert" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_time_scope_update" ON "silver"."lo3rwang_time" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "loc_blocks_admin_write" ON "silver"."loc_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "loc_blocks_public_read" ON "silver"."loc_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "loc_search_keywords_admin_read" ON "silver"."loc_search_keywords" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((silver.can_manage_global() AND (searched_at >= (now() - '7 days'::interval))));

CREATE POLICY "loc_theme_admin_write" ON "silver"."loc_theme" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "loc_theme_public_read" ON "silver"."loc_theme" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_public_read" ON "silver"."lrunes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_scope_update" ON "silver"."lrunes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_blocks_public_read" ON "silver"."lrunes_blocks" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_blocks_scope_write" ON "silver"."lrunes_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_public_read" ON "silver"."lrunes_daily" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_daily_scope_delete" ON "silver"."lrunes_daily" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_insert" ON "silver"."lrunes_daily" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_update" ON "silver"."lrunes_daily" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_authenticated_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((searchable IS TRUE) OR silver.can_manage_scope('lrunes'::text)));

CREATE POLICY "lrunes_galaxy_public_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous" USING ((searchable IS TRUE));

CREATE POLICY "lrunes_galaxy_scope_update" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_media_public_read" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_media_scope_update" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_public_read" ON "silver"."lrunes_time" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_time_scope_delete" ON "silver"."lrunes_time" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_scope_insert" ON "silver"."lrunes_time" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_time_scope_update" ON "silver"."lrunes_time" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "manage_authenticated_read" ON "silver"."manage" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "manage_public_mapping_read" ON "silver"."manage" AS PERMISSIVE FOR SELECT TO "anonymous" USING (true);

CREATE POLICY "runes_public_read" ON "silver"."runes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_scope_update" ON "silver"."runes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "runes_etc_public_read" ON "silver"."runes_etc" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_group_public_read" ON "silver"."runes_group" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_group_source_sharing_insert" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_group_source_sharing_read" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_group_source_sharing_update" ON "silver"."scope_group_source_sharing" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_other_sources_public_read" ON "silver"."scope_other_sources" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_other_sources_scope_insert" ON "silver"."scope_other_sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_other_sources_scope_update" ON "silver"."scope_other_sources" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_registry_anonymous_read" ON "silver"."scope_registry" AS PERMISSIVE FOR SELECT TO "anonymous" USING (true);

CREATE POLICY "scope_registry_authenticated_read" ON "silver"."scope_registry" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "scope_source_subcategories_insert" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "scope_source_subcategories_read" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "scope_source_subcategories_update" ON "silver"."scope_source_subcategories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope(scope_id)) WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "source_aliases_admin_insert" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_aliases_admin_update" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_aliases_public_read" ON "silver"."statistics_source_aliases" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "source_categories_admin_insert" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_categories_admin_update" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_global()) WITH CHECK (silver.can_manage_global());

CREATE POLICY "source_categories_public_read" ON "silver"."statistics_source_categories" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

GRANT USAGE ON SCHEMA silver,api TO anonymous,authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA silver,api FROM PUBLIC;

GRANT EXECUTE ON FUNCTION api.request_claims(),api.current_user_id(),silver.current_auth_email(),silver.can_manage_global(),silver.can_manage_scope(text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.management_write(text,text,jsonb,jsonb,jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION silver.management_write(text,text,jsonb,jsonb,jsonb),silver.apply_keyword_classification(text,jsonb),silver.copy_rune66_keyword_class(text),silver.delete_scope(text),silver.log_search_keyword(text,text),silver.manage_scope_registry(text,text,jsonb),silver.move_scope_block(text,text,text,integer),silver.provision_scope(text,text,text,date,text,text,text,text,boolean),silver.is_current_email_blocklisted(),silver.read_keyword_class(text,uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION silver.read_scope_page_copy(text),silver.log_search_keyword(text,text),silver.read_keyword_class(text,uuid) TO anonymous,authenticated;

GRANT DELETE ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT INSERT ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT SELECT ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT UPDATE ON "api"."lo3rwang_keywords_manage" TO "authenticated";

GRANT DELETE ON "api"."user_records" TO "authenticated";

GRANT INSERT ON "api"."user_records" TO "authenticated";

GRANT SELECT ON "api"."user_records" TO "authenticated";

GRANT UPDATE ON "api"."user_records" TO "authenticated";

GRANT DELETE ON "api"."user_settings" TO "authenticated";

GRANT INSERT ON "api"."user_settings" TO "authenticated";

GRANT SELECT ON "api"."user_settings" TO "authenticated";

GRANT UPDATE ON "api"."user_settings" TO "authenticated";

GRANT DELETE ON "silver"."database_targets" TO "authenticated";

GRANT INSERT ON "silver"."database_targets" TO "authenticated";

GRANT SELECT ON "silver"."database_targets" TO "authenticated";

GRANT UPDATE ON "silver"."database_targets" TO "authenticated";

GRANT DELETE ON "silver"."email_blocklist" TO "authenticated";

GRANT INSERT ON "silver"."email_blocklist" TO "authenticated";

GRANT SELECT ON "silver"."email_blocklist" TO "authenticated";

GRANT SELECT ON "silver"."game" TO "anonymous";

GRANT DELETE ON "silver"."game" TO "authenticated";

GRANT INSERT ON "silver"."game" TO "authenticated";

GRANT SELECT ON "silver"."game" TO "authenticated";

GRANT UPDATE ON "silver"."game" TO "authenticated";

GRANT DELETE ON "silver"."keyword_classes" TO "authenticated";

GRANT INSERT ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_blocks" TO "anonymous";

GRANT DELETE ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT DELETE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "anonymous";

GRANT DELETE ON "silver"."lo3rwang_time" TO "authenticated";

GRANT INSERT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."loc_blocks" TO "anonymous";

GRANT DELETE ON "silver"."loc_blocks" TO "authenticated";

GRANT INSERT ON "silver"."loc_blocks" TO "authenticated";

GRANT SELECT ON "silver"."loc_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."loc_blocks" TO "authenticated";

GRANT SELECT ON "silver"."loc_search_keywords" TO "authenticated";

GRANT SELECT ON "silver"."loc_theme" TO "anonymous";

GRANT DELETE ON "silver"."loc_theme" TO "authenticated";

GRANT INSERT ON "silver"."loc_theme" TO "authenticated";

GRANT SELECT ON "silver"."loc_theme" TO "authenticated";

GRANT UPDATE ON "silver"."loc_theme" TO "authenticated";

GRANT SELECT ON "silver"."lrunes" TO "anonymous";

GRANT SELECT ON "silver"."lrunes" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_blocks" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_blocks" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_blocks" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_blocks" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_daily" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_daily" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_daily" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_daily" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_daily" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lrunes_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lrunes_galaxy_media" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_time" TO "anonymous";

GRANT DELETE ON "silver"."lrunes_time" TO "authenticated";

GRANT INSERT ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."lrunes_time" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."manage" TO "anonymous";

GRANT SELECT ON "silver"."manage" TO "anonymous";

GRANT SELECT ON "silver"."manage" TO "authenticated";

GRANT SELECT ON "silver"."runes" TO "anonymous";

GRANT SELECT ON "silver"."runes" TO "authenticated";

GRANT SELECT ON "silver"."runes_etc" TO "anonymous";

GRANT SELECT ON "silver"."runes_etc" TO "authenticated";

GRANT SELECT ON "silver"."runes_group" TO "anonymous";

GRANT SELECT ON "silver"."runes_group" TO "authenticated";

GRANT SELECT ON "silver"."scope_group_source_sharing" TO "anonymous";

GRANT INSERT ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT SELECT ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT UPDATE ON "silver"."scope_group_source_sharing" TO "authenticated";

GRANT SELECT ON "silver"."scope_other_sources" TO "anonymous";

GRANT INSERT ON "silver"."scope_other_sources" TO "authenticated";

GRANT SELECT ON "silver"."scope_other_sources" TO "authenticated";

GRANT UPDATE ON "silver"."scope_other_sources" TO "authenticated";

GRANT SELECT ON "silver"."scope_registry" TO "anonymous";

GRANT SELECT ON "silver"."scope_registry" TO "anonymous";

GRANT SELECT ON "silver"."scope_registry" TO "authenticated";

GRANT SELECT ON "silver"."scope_source_subcategories" TO "anonymous";

GRANT INSERT ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT SELECT ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT UPDATE ON "silver"."scope_source_subcategories" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_aliases" TO "anonymous";

GRANT INSERT ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT UPDATE ON "silver"."statistics_source_aliases" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_categories" TO "anonymous";

GRANT INSERT ON "silver"."statistics_source_categories" TO "authenticated";

GRANT SELECT ON "silver"."statistics_source_categories" TO "authenticated";

GRANT UPDATE ON "silver"."statistics_source_categories" TO "authenticated";

GRANT SELECT (id,role,birthday,galaxy,time) ON silver.manage TO anonymous;

GRANT USAGE,SELECT ON SEQUENCE silver.lo3rwang_keywords_keyword_id_seq TO authenticated;
