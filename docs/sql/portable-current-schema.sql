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
  CONSTRAINT "lo3rwang_keyword_min_chars_check" CHECK (keyword_min_chars >= 0 AND keyword_min_chars <= 10000),
  CONSTRAINT "lo3rwang_keyword_min_documents_check" CHECK (keyword_min_documents >= 0 AND keyword_min_documents <= 1000000),
  CONSTRAINT "lo3rwang_keyword_document_count_check" CHECK (keyword_document_count >= 0),
  CONSTRAINT "lo3rwang_pkey" PRIMARY KEY (id),
  CONSTRAINT "lo3rwang_current_keyword_class_fk" FOREIGN KEY (current_keyword_class_id) REFERENCES silver.keyword_classes(class_id)
);

CREATE TABLE "silver"."lo3rwang_galaxy" (
  "uid" character(8) NOT NULL,
  "content_type" text NOT NULL,
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
  CONSTRAINT "lo3rwang_galaxy_class_id_check" CHECK (class_id IS NULL OR class_id >= 1 AND class_id <= 8),
  CONSTRAINT "lo3rwang_galaxy_group_lists_shape_check" CHECK (group_lists = 'false'::jsonb OR jsonb_typeof(group_lists) = 'object'::text),
  CONSTRAINT "lo3rwang_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lo3rwang_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
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
  CONSTRAINT "lo3rwang_keywords_class_fk" FOREIGN KEY (class_id) REFERENCES silver.keyword_classes(class_id),
  CONSTRAINT "lo3rwang_keywords_array_check" CHECK (jsonb_typeof(keywords) = 'array'::text),
  CONSTRAINT "lo3rwang_keywords_group_nonempty" CHECK (length(btrim(group_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_class_name_nonempty" CHECK (length(btrim(class_name)) > 0),
  CONSTRAINT "lo3rwang_keywords_class_group_nonempty" CHECK (length(btrim(class_group)) > 0),
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
  "anchor_pair" text,
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "style_tags" text,
  "style_tag_descriptions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lo3rwang_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lo3rwang_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text])),
  CONSTRAINT "lo3rwang_time_record_type_resource_id_key" UNIQUE (record_type, resource_id)
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
  CONSTRAINT "lrunes_pkey" PRIMARY KEY (id)
);

CREATE TABLE "silver"."lrunes_daily" (
  "record_id" text NOT NULL,
  "record_date" date NOT NULL,
  "draw_kind" text NOT NULL,
  "rune_number" integer NOT NULL,
  "direction" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lrunes_daily_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_daily_record_date_draw_kind_key" UNIQUE (record_date, draw_kind),
  CONSTRAINT "lrunes_daily_rune_number_check" CHECK (rune_number >= 0 AND rune_number <= 66)
);

CREATE TABLE "silver"."lrunes_galaxy" (
  "uid" character(8) NOT NULL,
  "content_type" text NOT NULL,
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
  CONSTRAINT "lo3rwang_galaxy_uid_format_check" CHECK (uid ~ '^[A-Za-z0-9]{8}$'::text),
  CONSTRAINT "lrunes_galaxy_content_nonblank" CHECK (content IS NULL OR btrim(content) <> ''::text),
  CONSTRAINT "lrunes_galaxy_content_required_current" CHECK (content IS NOT NULL AND btrim(content) <> ''::text),
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
  "anchor_pair" text,
  "date_status" text,
  "year_value" integer,
  "visibility" text,
  "style_tags" text,
  "style_tag_descriptions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lrunes_time_pkey" PRIMARY KEY (record_id),
  CONSTRAINT "lrunes_time_record_type_check" CHECK (record_type = ANY (ARRAY['anchor'::text, 'period'::text, 'event'::text])),
  CONSTRAINT "lrunes_time_record_type_resource_id_key" UNIQUE (record_type, resource_id)
);

CREATE TABLE "silver"."manage" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "galaxy" text,
  "time" text,
  "birthday" date,
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

ALTER TABLE "silver"."lo3rwang_galaxy_media" ADD CONSTRAINT "lo3rwang_galaxy_media_galaxy_link_fkey" FOREIGN KEY (galaxy_link) REFERENCES silver.lo3rwang_galaxy(uid) ON UPDATE CASCADE ON DELETE SET NULL;

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

CREATE INDEX idx_lo3rwang_galaxy_content_type ON silver.lo3rwang_galaxy USING btree (content_type);

CREATE INDEX idx_lo3rwang_galaxy_createtime ON silver.lo3rwang_galaxy USING btree (createtime);

CREATE INDEX idx_lo3rwang_galaxy_ref_id ON silver.lo3rwang_galaxy USING btree (ref_id) WHERE (ref_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_id ON silver.lo3rwang_galaxy USING btree (source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_source_name ON silver.lo3rwang_galaxy USING btree (source_name) WHERE (source_name IS NOT NULL);

CREATE INDEX idx_lo3rwang_galaxy_target_id ON silver.lo3rwang_galaxy USING btree (target_id) WHERE (target_id IS NOT NULL);

CREATE UNIQUE INDEX lo3rwang_galaxy_uid_ci_uq ON silver.lo3rwang_galaxy USING btree (lower((uid)::text));

CREATE INDEX idx_lo3rwang_galaxy_media_createtime ON silver.lo3rwang_galaxy_media USING btree (createtime);

CREATE INDEX lo3rwang_galaxy_media_link_idx ON silver.lo3rwang_galaxy_media USING btree (galaxy_link);

CREATE UNIQUE INDEX lo3rwang_galaxy_media_url_uidx ON silver.lo3rwang_galaxy_media USING btree (url) WHERE (url IS NOT NULL);

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_name_idx ON silver.lo3rwang_keywords USING btree (group_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_group_item_no_idx ON silver.lo3rwang_keywords USING btree (group_name, item_no);

CREATE INDEX lo3rwang_keywords_order_idx ON silver.lo3rwang_keywords USING btree (group_name, order_no, item_no);

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_name_idx ON silver.lo3rwang_keywords USING btree (class_name, lower(item_name));

CREATE UNIQUE INDEX lo3rwang_keywords_class_item_no_idx ON silver.lo3rwang_keywords USING btree (class_name, item_no);

CREATE INDEX lo3rwang_keywords_class_group_order_idx ON silver.lo3rwang_keywords USING btree (class_name, class_group, order_no, item_no);

CREATE INDEX lo3rwang_keywords_class_id_idx ON silver.lo3rwang_keywords USING btree (class_id, order_no, item_no);

CREATE INDEX lo3rwang_time_date_idx ON silver.lo3rwang_time USING btree (time_date);

CREATE INDEX lo3rwang_time_order_idx ON silver.lo3rwang_time USING btree (record_type, display_order);

CREATE INDEX lrunes_galaxy_content_type_idx ON silver.lrunes_galaxy USING btree (content_type);

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

CREATE INDEX manage_email_lower_idx ON silver.manage USING btree (lower(email));

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
 SELECT EXISTS (
 SELECT 1 FROM silver.manage
 WHERE lower(email)=lower(silver.current_auth_email())
 AND role='admin'
 )
 $function$
;

CREATE OR REPLACE FUNCTION silver.can_manage_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api'
AS $function$
 SELECT EXISTS (
 SELECT 1 FROM silver.manage
 WHERE lower(email)=lower(silver.current_auth_email())
 AND (role='admin' OR (role='scope' AND id=p_scope_id))
 )
 $function$
;

CREATE OR REPLACE FUNCTION api.management_write(p_table text, p_operation text, p_rows jsonb DEFAULT NULL::jsonb, p_values jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
DECLARE
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
BEGIN
 IF coalesce(trim(p_table),'')='' THEN
 RAISE EXCEPTION 'table is required';
 END IF;
 v_rel := to_regclass(p_table);
 IF v_rel IS NULL THEN
 RAISE EXCEPTION 'unknown relation';
 END IF;

 IF v_rel = 'silver.manage'::regclass THEN
 v_allowed := silver.can_manage_global();
 ELSE
 FOR v_scope IN
 SELECT DISTINCT id,
 coalesce(nullif(galaxy,''),'galaxy') AS galaxy,
 coalesce(nullif(time,''),'time') AS time
 FROM silver.manage
 LOOP
 IF NOT silver.can_manage_scope(v_scope.id) THEN
 CONTINUE;
 END IF;

 IF v_rel = to_regclass(format('silver.%I',v_scope.id))
 OR v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy))
 OR v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.galaxy||'_media'))
 OR v_rel = to_regclass(format('silver.%I',v_scope.id||'_'||v_scope.time))
 THEN
 v_allowed := true;
 EXIT;
 END IF;
 END LOOP;
 END IF;

 IF NOT v_allowed THEN
 RAISE EXCEPTION 'management permission denied';
 END IF;

 IF p_operation='scope_sync' THEN
 IF v_rel <> 'silver.manage'::regclass THEN
 RAISE EXCEPTION 'scope_sync only supports silver.manage';
 END IF;
 IF jsonb_typeof(p_values) <> 'object' THEN
 RAISE EXCEPTION 'values must be an object';
 END IF;
 IF jsonb_typeof(p_filters) <> 'array' THEN
 RAISE EXCEPTION 'filters must be an array';
 END IF;

 FOR v_filter IN SELECT value FROM jsonb_array_elements(p_filters)
 LOOP
 IF v_filter->>'column'='id' THEN v_scope_id:=coalesce(v_filter->>'value',''); END IF;
 IF v_filter->>'column'='email' THEN v_email:=coalesce(v_filter->>'value',''); END IF;
 END LOOP;

 IF v_scope_id='' OR v_email='' THEN
 RAISE EXCEPTION 'scope_sync requires id and email';
 END IF;
 IF NOT EXISTS(
 SELECT 1 FROM silver.manage
 WHERE id=v_scope_id AND lower(email)=lower(v_email)
 ) THEN
 RAISE EXCEPTION 'mapping row not found';
 END IF;

 UPDATE silver.manage
 SET role=CASE
 WHEN lower(email)=lower(v_email) AND p_values ? 'role'
 THEN coalesce(nullif(p_values->>'role',''),role)
 ELSE role
 END,
 galaxy=CASE WHEN p_values ? 'galaxy' THEN coalesce(nullif(p_values->>'galaxy',''),galaxy) ELSE galaxy END,
 time=CASE WHEN p_values ? 'time' THEN coalesce(nullif(p_values->>'time',''),time) ELSE time END,
 birthday=CASE
 WHEN p_values ? 'birthday' THEN nullif(p_values->>'birthday','')::date
 ELSE birthday
 END
 WHERE id=v_scope_id;

 GET DIAGNOSTICS v_affected = ROW_COUNT;
 RETURN jsonb_build_object('count',v_affected);

 ELSIF p_operation='insert' THEN
 IF jsonb_typeof(p_rows) <> 'array' THEN
 RAISE EXCEPTION 'rows must be an array';
 END IF;
 IF jsonb_array_length(p_rows)=0 THEN
 RETURN jsonb_build_object('count',0);
 END IF;

 FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
 LOOP
 SELECT
 string_agg(quote_ident(k.key),',' ORDER BY k.key),
 string_agg(
 format('((jsonb_populate_record(NULL::%s,$1)).%I)',v_rel::text,k.key),
 ',' ORDER BY k.key
 )
 INTO v_columns,v_values_expr
 FROM jsonb_object_keys(v_row) AS k(key)
 JOIN pg_attribute a
 ON a.attrelid=v_rel
 AND a.attname=k.key
 AND a.attnum>0
 AND NOT a.attisdropped
 AND a.attgenerated=''
 AND a.attidentity='';

 IF coalesce(v_columns,'')='' THEN
 RAISE EXCEPTION 'no writable columns';
 END IF;

 EXECUTE format(
 'insert into %s (%s) values (%s)',
 v_rel::text,v_columns,v_values_expr
 ) USING v_row;
 v_count := v_count + 1;
 END LOOP;

 RETURN jsonb_build_object('count',v_count);

 ELSIF p_operation='update' THEN
 IF jsonb_typeof(p_values) <> 'object' THEN
 RAISE EXCEPTION 'values must be an object';
 END IF;
 IF jsonb_typeof(p_filters) <> 'array' OR jsonb_array_length(p_filters)=0 THEN
 RAISE EXCEPTION 'filters are required';
 END IF;

 IF EXISTS (
 SELECT 1
 FROM jsonb_object_keys(p_values) k(key)
 JOIN pg_index i ON i.indrelid=v_rel AND i.indisprimary
 JOIN pg_attribute a ON a.attrelid=v_rel AND a.attnum = ANY(i.indkey)
 WHERE a.attname=k.key
 ) THEN
 RAISE EXCEPTION 'primary key update is not allowed';
 END IF;

 SELECT string_agg(
 format('%I=((jsonb_populate_record(NULL::%s,$1)).%I)',k.key,v_rel::text,k.key),
 ',' ORDER BY k.key
 )
 INTO v_set_expr
 FROM jsonb_object_keys(p_values) AS k(key)
 JOIN pg_attribute a
 ON a.attrelid=v_rel
 AND a.attname=k.key
 AND a.attnum>0
 AND NOT a.attisdropped
 AND a.attgenerated=''
 AND a.attidentity='';

 IF coalesce(v_set_expr,'')='' THEN
 RAISE EXCEPTION 'no writable columns';
 END IF;

 FOR v_filter IN SELECT value FROM jsonb_array_elements(p_filters)
 LOOP
 IF coalesce(v_filter->>'operator','eq') <> 'eq' THEN
 RAISE EXCEPTION 'only eq filters are supported';
 END IF;
 v_filter_col := v_filter->>'column';
 IF NOT EXISTS(
 SELECT 1 FROM pg_attribute
 WHERE attrelid=v_rel AND attname=v_filter_col AND attnum>0 AND NOT attisdropped
 ) THEN
 RAISE EXCEPTION 'invalid filter column';
 END IF;
 IF v_where<>'' THEN v_where := v_where||' and '; END IF;
 v_where := v_where||format(
 '%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
 v_filter_col,
 v_rel::text,
 jsonb_build_object(v_filter_col,v_filter->'value')::text,
 v_filter_col
 );
 END LOOP;

 EXECUTE format('update %s set %s where %s',v_rel::text,v_set_expr,v_where) USING p_values;
 GET DIAGNOSTICS v_affected = ROW_COUNT;
 RETURN jsonb_build_object('count',v_affected);

 ELSIF p_operation='delete' THEN
 IF jsonb_typeof(p_filters) <> 'array' OR jsonb_array_length(p_filters)=0 THEN
 RAISE EXCEPTION 'filters are required';
 END IF;

 IF v_rel='silver.manage'::regclass THEN
 FOR v_filter IN SELECT value FROM jsonb_array_elements(p_filters)
 LOOP
 IF v_filter->>'column'='id' THEN v_scope_id:=coalesce(v_filter->>'value',''); END IF;
 IF v_filter->>'column'='email' THEN v_email:=coalesce(v_filter->>'value',''); END IF;
 END LOOP;

 IF v_scope_id<>'' AND v_email<>'' AND EXISTS(
 SELECT 1 FROM silver.manage WHERE id=v_scope_id AND lower(email)=lower(v_email)
 ) THEN
 SELECT count(*) INTO v_scope_rows FROM silver.manage WHERE id=v_scope_id;
 IF v_scope_rows<=1 THEN
 RAISE EXCEPTION 'cannot remove the final Scope registry row';
 END IF;
 END IF;
 END IF;

 FOR v_filter IN SELECT value FROM jsonb_array_elements(p_filters)
 LOOP
 IF coalesce(v_filter->>'operator','eq') <> 'eq' THEN
 RAISE EXCEPTION 'only eq filters are supported';
 END IF;
 v_filter_col := v_filter->>'column';
 IF NOT EXISTS(
 SELECT 1 FROM pg_attribute
 WHERE attrelid=v_rel AND attname=v_filter_col AND attnum>0 AND NOT attisdropped
 ) THEN
 RAISE EXCEPTION 'invalid filter column';
 END IF;
 IF v_where<>'' THEN v_where := v_where||' and '; END IF;
 v_where := v_where||format(
 '%I is not distinct from ((jsonb_populate_record(NULL::%s,%L::jsonb)).%I)',
 v_filter_col,
 v_rel::text,
 jsonb_build_object(v_filter_col,v_filter->'value')::text,
 v_filter_col
 );
 END LOOP;

 EXECUTE format('delete from %s where %s',v_rel::text,v_where);
 GET DIAGNOSTICS v_affected = ROW_COUNT;
 RETURN jsonb_build_object('count',v_affected);
 ELSE
 RAISE EXCEPTION 'unsupported operation';
 END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_rows jsonb;
 v_meta jsonb := '{}'::jsonb;
 v_affected integer := 0;
 v_document_count integer := 0;
 v_expected integer := 0;
 v_meta_class_id text := '';
BEGIN
 IF jsonb_typeof(p_rows)='object' THEN
   v_rows := p_rows->'rows';
   v_meta := coalesce(p_rows->'meta','{}'::jsonb);
 ELSE
   v_rows := p_rows;
 END IF;
 IF jsonb_typeof(v_rows) <> 'array' THEN RAISE EXCEPTION 'rows must be an array'; END IF;
 v_expected := jsonb_array_length(v_rows);
 v_meta_class_id := coalesce(v_meta->>'class_id','');
 IF v_meta_class_id<>'' AND NOT EXISTS(
   SELECT 1 FROM silver.lo3rwang
   WHERE id='lo3rwang' AND current_keyword_class_id::text=v_meta_class_id
 ) THEN
   RAISE EXCEPTION 'current keyword Class changed before batch write';
 END IF;
 SELECT count(*) INTO v_document_count
 FROM jsonb_array_elements(v_rows) item
 WHERE coalesce(item->'group_lists','false'::jsonb) <> 'false'::jsonb;
 WITH payload AS (
   SELECT upper(btrim(x.uid))::character(8) AS uid,
          x.class_id,
          coalesce(x.group_lists,'false'::jsonb) AS group_lists
   FROM jsonb_to_recordset(v_rows) AS x(uid text,class_id smallint,group_lists jsonb)
   WHERE btrim(coalesce(x.uid,'')) <> ''
 )
 UPDATE silver.lo3rwang_galaxy g
 SET class_id=p.class_id,group_lists=p.group_lists
 FROM payload p
 WHERE g.uid=p.uid;
 GET DIAGNOSTICS v_affected = ROW_COUNT;
 IF v_affected <> v_expected THEN
   RAISE EXCEPTION 'keyword classification incomplete: expected %, affected %',v_expected,v_affected;
 END IF;
 UPDATE silver.lo3rwang
 SET staticstime=now(),keyword_document_count=v_document_count,keyword_meta=v_meta,updated_at=now()
 WHERE id='lo3rwang';
 IF NOT FOUND THEN RAISE EXCEPTION 'lo3rwang config row not found'; END IF;
 RETURN v_affected;
END;
$function$
;

CREATE OR REPLACE FUNCTION api.read_keyword_class(p_scope_id text,p_class_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver', 'api', 'public'
AS $function$
DECLARE
 v_scope text := lower(btrim(coalesce(p_scope_id,'')));
 v_config regclass;
 v_keywords regclass;
 v_share boolean := false;
 v_allowed boolean := false;
 v_result jsonb := '[]'::jsonb;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]*
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

CREATE VIEW "api"."lo3rwang_keywords_manage" WITH (security_invoker=true, check_option=local) AS  SELECT keyword_id,
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

CREATE TRIGGER lo3rwang_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lo3rwang_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER lrunes_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lrunes_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

ALTER TABLE "api"."user_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "api"."user_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."keyword_classes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_daily" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_records_owner_all" ON "api"."user_records" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "user_settings_owner_all" ON "api"."user_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "keyword_classes_scope_select" ON "silver"."keyword_classes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_insert" ON "silver"."keyword_classes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_delete" ON "silver"."keyword_classes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "lo3rwang_keywords_scope_all" ON "silver"."lo3rwang_keywords" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_public_read" ON "silver"."lo3rwang" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_scope_update" ON "silver"."lo3rwang" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_public_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_scope_update" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_media_public_read" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_media_scope_update" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lrunes_public_read" ON "silver"."lrunes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_scope_update" ON "silver"."lrunes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_public_read" ON "silver"."lrunes_daily" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_daily_scope_delete" ON "silver"."lrunes_daily" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_insert" ON "silver"."lrunes_daily" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_update" ON "silver"."lrunes_daily" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_public_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_scope_update" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_media_public_read" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_media_scope_update" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "runes_public_read" ON "silver"."runes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_scope_update" ON "silver"."runes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

GRANT USAGE ON SCHEMA silver,api TO anonymous,authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA silver,api FROM PUBLIC;

GRANT EXECUTE ON FUNCTION api.request_claims(),api.current_user_id(),silver.current_auth_email(),silver.can_manage_global(),silver.can_manage_scope(text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.management_write(text,text,jsonb,jsonb,jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION api.apply_keyword_classification(jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION api.read_keyword_class(text,uuid) TO anonymous,authenticated;

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

GRANT SELECT ON "silver"."game" TO "anonymous";

GRANT SELECT ON "silver"."game" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT SELECT,INSERT,UPDATE,DELETE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT,INSERT,DELETE ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."lrunes" TO "anonymous";

GRANT SELECT ON "silver"."lrunes" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes" TO "authenticated";

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

GRANT SELECT ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."manage" TO "authenticated";

GRANT SELECT ON "silver"."runes" TO "anonymous";

GRANT SELECT ON "silver"."runes" TO "authenticated";

GRANT SELECT ON "silver"."runes_etc" TO "anonymous";

GRANT SELECT ON "silver"."runes_etc" TO "authenticated";

GRANT SELECT ON "silver"."runes_group" TO "anonymous";

GRANT SELECT ON "silver"."runes_group" TO "authenticated";

GRANT SELECT (id,role,birthday,galaxy,time) ON silver.manage TO anonymous;

GRANT USAGE,SELECT ON SEQUENCE silver.lo3rwang_keywords_keyword_id_seq TO authenticated;
 THEN RETURN NULL; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM silver.keyword_classes
   WHERE class_id=p_class_id AND scope_id=v_scope
 ) THEN
   RETURN NULL;
 END IF;

 v_config := to_regclass(format('silver.%I',v_scope));
 v_keywords := to_regclass(format('silver.%I_keywords',v_scope));
 IF v_config IS NULL OR v_keywords IS NULL THEN RETURN NULL; END IF;

 v_allowed := silver.can_manage_scope(v_scope);
 IF NOT v_allowed THEN
   BEGIN
     EXECUTE format(
       'select coalesce(keyword_class_share_enabled,false) from %s where id=$1',
       v_config
     )
     INTO v_share
     USING v_scope;
   EXCEPTION WHEN undefined_column THEN
     v_share := false;
   END;
   v_allowed := v_share;
 END IF;

 IF NOT v_allowed THEN RETURN NULL; END IF;

 EXECUTE format(
   'select coalesce(jsonb_agg(to_jsonb(k) order by k.order_no,k.item_no),''[]''::jsonb) from %s k where k.class_id=$1',
   v_keywords
 )
 INTO v_result
 USING p_class_id;

 RETURN coalesce(v_result,'[]'::jsonb);
END;
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

CREATE VIEW "api"."lo3rwang_keywords_manage" WITH (security_invoker=true, check_option=local) AS  SELECT keyword_id,
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

CREATE TRIGGER lo3rwang_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lo3rwang_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

CREATE TRIGGER lrunes_galaxy_content_validity BEFORE INSERT OR UPDATE OF content, searchable ON silver.lrunes_galaxy FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity();

ALTER TABLE "api"."user_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "api"."user_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."keyword_classes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lo3rwang_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_daily" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."lrunes_galaxy_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "silver"."runes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_records_owner_all" ON "api"."user_records" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "user_settings_owner_all" ON "api"."user_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = api.current_user_id())) WITH CHECK ((owner_id = api.current_user_id()));

CREATE POLICY "keyword_classes_scope_select" ON "silver"."keyword_classes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_insert" ON "silver"."keyword_classes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY "keyword_classes_scope_delete" ON "silver"."keyword_classes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope(scope_id));

CREATE POLICY "lo3rwang_keywords_scope_all" ON "silver"."lo3rwang_keywords" AS PERMISSIVE FOR ALL TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_public_read" ON "silver"."lo3rwang" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_scope_update" ON "silver"."lo3rwang" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_public_read" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_scope_update" ON "silver"."lo3rwang_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lo3rwang_galaxy_media_public_read" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lo3rwang_galaxy_media_scope_update" ON "silver"."lo3rwang_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lo3rwang'::text)) WITH CHECK (silver.can_manage_scope('lo3rwang'::text));

CREATE POLICY "lrunes_public_read" ON "silver"."lrunes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_scope_update" ON "silver"."lrunes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_public_read" ON "silver"."lrunes_daily" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_daily_scope_delete" ON "silver"."lrunes_daily" AS PERMISSIVE FOR DELETE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_insert" ON "silver"."lrunes_daily" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_daily_scope_update" ON "silver"."lrunes_daily" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_public_read" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_scope_update" ON "silver"."lrunes_galaxy" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "lrunes_galaxy_media_public_read" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "lrunes_galaxy_media_scope_update" ON "silver"."lrunes_galaxy_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

CREATE POLICY "runes_public_read" ON "silver"."runes" AS PERMISSIVE FOR SELECT TO "anonymous","authenticated" USING (true);

CREATE POLICY "runes_scope_update" ON "silver"."runes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (silver.can_manage_scope('lrunes'::text)) WITH CHECK (silver.can_manage_scope('lrunes'::text));

GRANT USAGE ON SCHEMA silver,api TO anonymous,authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA silver,api FROM PUBLIC;

GRANT EXECUTE ON FUNCTION api.request_claims(),api.current_user_id(),silver.current_auth_email(),silver.can_manage_global(),silver.can_manage_scope(text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.management_write(text,text,jsonb,jsonb,jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION api.apply_keyword_classification(jsonb) TO authenticated;

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

GRANT SELECT ON "silver"."game" TO "anonymous";

GRANT SELECT ON "silver"."game" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT UPDATE ON "silver"."lo3rwang_galaxy_media" TO "authenticated";

GRANT SELECT,INSERT,UPDATE,DELETE ON "silver"."lo3rwang_keywords" TO "authenticated";

GRANT SELECT,INSERT,DELETE ON "silver"."keyword_classes" TO "authenticated";

GRANT SELECT ON "silver"."lo3rwang_time" TO "anonymous";

GRANT SELECT ON "silver"."lo3rwang_time" TO "authenticated";

GRANT SELECT ON "silver"."lrunes" TO "anonymous";

GRANT SELECT ON "silver"."lrunes" TO "authenticated";

GRANT UPDATE ON "silver"."lrunes" TO "authenticated";

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

GRANT SELECT ON "silver"."lrunes_time" TO "authenticated";

GRANT SELECT ON "silver"."manage" TO "authenticated";

GRANT SELECT ON "silver"."runes" TO "anonymous";

GRANT SELECT ON "silver"."runes" TO "authenticated";

GRANT SELECT ON "silver"."runes_etc" TO "anonymous";

GRANT SELECT ON "silver"."runes_etc" TO "authenticated";

GRANT SELECT ON "silver"."runes_group" TO "anonymous";

GRANT SELECT ON "silver"."runes_group" TO "authenticated";

GRANT SELECT (id,role,birthday,galaxy,time) ON silver.manage TO anonymous;

GRANT USAGE,SELECT ON SEQUENCE silver.lo3rwang_keywords_keyword_id_seq TO authenticated;
