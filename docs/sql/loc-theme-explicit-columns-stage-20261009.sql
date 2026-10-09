-- Phase 1: Backfill typed columns while current deployment can still read theme_attr.
-- Every known Theme token is a first-class PostgreSQL text column.
DO $validate$ BEGIN
  IF (SELECT count(*) FROM silver.loc_theme)<>8 THEN RAISE EXCEPTION 'Expected eight theme rows'; END IF;
  IF EXISTS(SELECT 1 FROM silver.loc_theme t WHERE
    jsonb_typeof(t.theme_attr->'tokens') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(t.theme_attr->'tokens'))<>43
    OR (SELECT count(*) FROM jsonb_object_keys(t.theme_attr))<>5
  ) THEN RAISE EXCEPTION 'Theme JSON structure is inconsistent'; END IF;
END $validate$;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "scheme" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "style_key" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "identity_color" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_bg" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_panel" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_panel_2" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_panel_strong" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_panel_nav" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_panel_tab" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_rune_bg" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_rune_selected_bg" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_line" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_line_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_line_softer" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_line_faint" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_text" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_muted" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_heading" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_danger" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_surface" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_surface_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_surface_faint" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_surface_status" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent_surface" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent_surface_strong" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent_border" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent_border_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_accent_border_faint" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_surface" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_surface_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_border" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_border_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_border_faint" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_ring" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_gold_ring_soft" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_danger_border" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_primary_start" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_primary_end" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_body_glow" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_body_mid" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_hero_start" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_hero_end" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_shadow" text;
ALTER TABLE silver.loc_theme ADD COLUMN IF NOT EXISTS "loc_shadow_card" text;
UPDATE silver.loc_theme SET
  "scheme"=theme_attr->>'scheme',
  "style_key"=theme_attr->>'style_key',
  "identity_color"=theme_attr->>'identity_color',
  "loc_bg"=theme_attr->'tokens'->>'--loc-bg',
  "loc_panel"=theme_attr->'tokens'->>'--loc-panel',
  "loc_panel_2"=theme_attr->'tokens'->>'--loc-panel-2',
  "loc_panel_strong"=theme_attr->'tokens'->>'--loc-panel-strong',
  "loc_panel_nav"=theme_attr->'tokens'->>'--loc-panel-nav',
  "loc_panel_tab"=theme_attr->'tokens'->>'--loc-panel-tab',
  "loc_rune_bg"=theme_attr->'tokens'->>'--loc-rune-bg',
  "loc_rune_selected_bg"=theme_attr->'tokens'->>'--loc-rune-selected-bg',
  "loc_line"=theme_attr->'tokens'->>'--loc-line',
  "loc_line_soft"=theme_attr->'tokens'->>'--loc-line-soft',
  "loc_line_softer"=theme_attr->'tokens'->>'--loc-line-softer',
  "loc_line_faint"=theme_attr->'tokens'->>'--loc-line-faint',
  "loc_text"=theme_attr->'tokens'->>'--loc-text',
  "loc_muted"=theme_attr->'tokens'->>'--loc-muted',
  "loc_heading"=theme_attr->'tokens'->>'--loc-heading',
  "loc_accent"=theme_attr->'tokens'->>'--loc-accent',
  "loc_gold"=theme_attr->'tokens'->>'--loc-gold',
  "loc_danger"=theme_attr->'tokens'->>'--loc-danger',
  "loc_surface"=theme_attr->'tokens'->>'--loc-surface',
  "loc_surface_soft"=theme_attr->'tokens'->>'--loc-surface-soft',
  "loc_surface_faint"=theme_attr->'tokens'->>'--loc-surface-faint',
  "loc_surface_status"=theme_attr->'tokens'->>'--loc-surface-status',
  "loc_accent_surface"=theme_attr->'tokens'->>'--loc-accent-surface',
  "loc_accent_surface_strong"=theme_attr->'tokens'->>'--loc-accent-surface-strong',
  "loc_accent_border"=theme_attr->'tokens'->>'--loc-accent-border',
  "loc_accent_border_soft"=theme_attr->'tokens'->>'--loc-accent-border-soft',
  "loc_accent_border_faint"=theme_attr->'tokens'->>'--loc-accent-border-faint',
  "loc_gold_surface"=theme_attr->'tokens'->>'--loc-gold-surface',
  "loc_gold_surface_soft"=theme_attr->'tokens'->>'--loc-gold-surface-soft',
  "loc_gold_border"=theme_attr->'tokens'->>'--loc-gold-border',
  "loc_gold_border_soft"=theme_attr->'tokens'->>'--loc-gold-border-soft',
  "loc_gold_border_faint"=theme_attr->'tokens'->>'--loc-gold-border-faint',
  "loc_gold_ring"=theme_attr->'tokens'->>'--loc-gold-ring',
  "loc_gold_ring_soft"=theme_attr->'tokens'->>'--loc-gold-ring-soft',
  "loc_danger_border"=theme_attr->'tokens'->>'--loc-danger-border',
  "loc_primary_start"=theme_attr->'tokens'->>'--loc-primary-start',
  "loc_primary_end"=theme_attr->'tokens'->>'--loc-primary-end',
  "loc_body_glow"=theme_attr->'tokens'->>'--loc-body-glow',
  "loc_body_mid"=theme_attr->'tokens'->>'--loc-body-mid',
  "loc_hero_start"=theme_attr->'tokens'->>'--loc-hero-start',
  "loc_hero_end"=theme_attr->'tokens'->>'--loc-hero-end',
  "loc_shadow"=theme_attr->'tokens'->>'--loc-shadow',
  "loc_shadow_card"=theme_attr->'tokens'->>'--loc-shadow-card';
DO $verify$ BEGIN
  IF EXISTS (SELECT 1 FROM silver.loc_theme WHERE
    "scheme" IS NULL OR btrim("scheme")='' OR
    "style_key" IS NULL OR btrim("style_key")='' OR
    "identity_color" IS NULL OR btrim("identity_color")='' OR
    "loc_bg" IS NULL OR btrim("loc_bg")='' OR
    "loc_panel" IS NULL OR btrim("loc_panel")='' OR
    "loc_panel_2" IS NULL OR btrim("loc_panel_2")='' OR
    "loc_panel_strong" IS NULL OR btrim("loc_panel_strong")='' OR
    "loc_panel_nav" IS NULL OR btrim("loc_panel_nav")='' OR
    "loc_panel_tab" IS NULL OR btrim("loc_panel_tab")='' OR
    "loc_rune_bg" IS NULL OR btrim("loc_rune_bg")='' OR
    "loc_rune_selected_bg" IS NULL OR btrim("loc_rune_selected_bg")='' OR
    "loc_line" IS NULL OR btrim("loc_line")='' OR
    "loc_line_soft" IS NULL OR btrim("loc_line_soft")='' OR
    "loc_line_softer" IS NULL OR btrim("loc_line_softer")='' OR
    "loc_line_faint" IS NULL OR btrim("loc_line_faint")='' OR
    "loc_text" IS NULL OR btrim("loc_text")='' OR
    "loc_muted" IS NULL OR btrim("loc_muted")='' OR
    "loc_heading" IS NULL OR btrim("loc_heading")='' OR
    "loc_accent" IS NULL OR btrim("loc_accent")='' OR
    "loc_gold" IS NULL OR btrim("loc_gold")='' OR
    "loc_danger" IS NULL OR btrim("loc_danger")='' OR
    "loc_surface" IS NULL OR btrim("loc_surface")='' OR
    "loc_surface_soft" IS NULL OR btrim("loc_surface_soft")='' OR
    "loc_surface_faint" IS NULL OR btrim("loc_surface_faint")='' OR
    "loc_surface_status" IS NULL OR btrim("loc_surface_status")='' OR
    "loc_accent_surface" IS NULL OR btrim("loc_accent_surface")='' OR
    "loc_accent_surface_strong" IS NULL OR btrim("loc_accent_surface_strong")='' OR
    "loc_accent_border" IS NULL OR btrim("loc_accent_border")='' OR
    "loc_accent_border_soft" IS NULL OR btrim("loc_accent_border_soft")='' OR
    "loc_accent_border_faint" IS NULL OR btrim("loc_accent_border_faint")='' OR
    "loc_gold_surface" IS NULL OR btrim("loc_gold_surface")='' OR
    "loc_gold_surface_soft" IS NULL OR btrim("loc_gold_surface_soft")='' OR
    "loc_gold_border" IS NULL OR btrim("loc_gold_border")='' OR
    "loc_gold_border_soft" IS NULL OR btrim("loc_gold_border_soft")='' OR
    "loc_gold_border_faint" IS NULL OR btrim("loc_gold_border_faint")='' OR
    "loc_gold_ring" IS NULL OR btrim("loc_gold_ring")='' OR
    "loc_gold_ring_soft" IS NULL OR btrim("loc_gold_ring_soft")='' OR
    "loc_danger_border" IS NULL OR btrim("loc_danger_border")='' OR
    "loc_primary_start" IS NULL OR btrim("loc_primary_start")='' OR
    "loc_primary_end" IS NULL OR btrim("loc_primary_end")='' OR
    "loc_body_glow" IS NULL OR btrim("loc_body_glow")='' OR
    "loc_body_mid" IS NULL OR btrim("loc_body_mid")='' OR
    "loc_hero_start" IS NULL OR btrim("loc_hero_start")='' OR
    "loc_hero_end" IS NULL OR btrim("loc_hero_end")='' OR
    "loc_shadow" IS NULL OR btrim("loc_shadow")='' OR
    "loc_shadow_card" IS NULL OR btrim("loc_shadow_card")=''
  ) THEN RAISE EXCEPTION 'Incomplete theme column migration'; END IF;
END $verify$;
ALTER TABLE silver.loc_theme ALTER COLUMN "scheme" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "style_key" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "identity_color" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_bg" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_panel" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_panel_2" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_panel_strong" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_panel_nav" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_panel_tab" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_rune_bg" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_rune_selected_bg" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_line" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_line_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_line_softer" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_line_faint" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_text" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_muted" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_heading" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_danger" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_surface" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_surface_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_surface_faint" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_surface_status" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent_surface" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent_surface_strong" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent_border" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent_border_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_accent_border_faint" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_surface" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_surface_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_border" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_border_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_border_faint" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_ring" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_gold_ring_soft" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_danger_border" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_primary_start" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_primary_end" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_body_glow" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_body_mid" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_hero_start" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_hero_end" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_shadow" SET NOT NULL;
ALTER TABLE silver.loc_theme ALTER COLUMN "loc_shadow_card" SET NOT NULL;
DO $scheme$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='silver.loc_theme'::regclass AND conname='loc_theme_scheme_check') THEN
    ALTER TABLE silver.loc_theme ADD CONSTRAINT loc_theme_scheme_check CHECK (scheme IN ('light','dark'));
  END IF;
END $scheme$;
