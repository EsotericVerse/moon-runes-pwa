-- Apply only after main Pages deploy has switched all readers/writers to typed columns.
-- Verify all eight themes and the exact 43 CSS values before irreversible removal.
DO $check$
BEGIN
  IF (SELECT COUNT(*) FROM silver.loc_theme) <> 8 THEN RAISE EXCEPTION 'Unexpected Theme count'; END IF;
  IF EXISTS(SELECT 1 FROM silver.loc_theme t WHERE
      t.scheme IS DISTINCT FROM t.theme_attr->>'scheme'
   OR t.style_key IS DISTINCT FROM t.theme_attr->>'style_key'
   OR t.identity_color IS DISTINCT FROM t.theme_attr->>'identity_color'
   OR t.theme_name IS DISTINCT FROM t.theme_attr->>'group'
   OR (t."loc_bg" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-bg')
   OR (t."loc_panel" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-panel')
   OR (t."loc_panel_2" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-panel-2')
   OR (t."loc_panel_strong" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-panel-strong')
   OR (t."loc_panel_nav" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-panel-nav')
   OR (t."loc_panel_tab" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-panel-tab')
   OR (t."loc_rune_bg" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-rune-bg')
   OR (t."loc_rune_selected_bg" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-rune-selected-bg')
   OR (t."loc_line" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-line')
   OR (t."loc_line_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-line-soft')
   OR (t."loc_line_softer" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-line-softer')
   OR (t."loc_line_faint" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-line-faint')
   OR (t."loc_text" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-text')
   OR (t."loc_muted" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-muted')
   OR (t."loc_heading" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-heading')
   OR (t."loc_accent" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent')
   OR (t."loc_gold" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold')
   OR (t."loc_danger" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-danger')
   OR (t."loc_surface" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-surface')
   OR (t."loc_surface_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-surface-soft')
   OR (t."loc_surface_faint" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-surface-faint')
   OR (t."loc_surface_status" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-surface-status')
   OR (t."loc_accent_surface" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent-surface')
   OR (t."loc_accent_surface_strong" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent-surface-strong')
   OR (t."loc_accent_border" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent-border')
   OR (t."loc_accent_border_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent-border-soft')
   OR (t."loc_accent_border_faint" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-accent-border-faint')
   OR (t."loc_gold_surface" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-surface')
   OR (t."loc_gold_surface_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-surface-soft')
   OR (t."loc_gold_border" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-border')
   OR (t."loc_gold_border_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-border-soft')
   OR (t."loc_gold_border_faint" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-border-faint')
   OR (t."loc_gold_ring" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-ring')
   OR (t."loc_gold_ring_soft" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-gold-ring-soft')
   OR (t."loc_danger_border" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-danger-border')
   OR (t."loc_primary_start" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-primary-start')
   OR (t."loc_primary_end" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-primary-end')
   OR (t."loc_body_glow" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-body-glow')
   OR (t."loc_body_mid" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-body-mid')
   OR (t."loc_hero_start" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-hero-start')
   OR (t."loc_hero_end" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-hero-end')
   OR (t."loc_shadow" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-shadow')
   OR (t."loc_shadow_card" IS DISTINCT FROM t.theme_attr->'tokens'->>'--loc-shadow-card')
  ) THEN RAISE EXCEPTION 'Typed Theme palette differs from legacy JSONB; keeping source column'; END IF;
END $check$;
-- The shared palette PK is an integer; the UI may render "theme-N" labels
-- but those prefixes are never stored in the database.
DO $identity$
BEGIN
  IF EXISTS (
    SELECT 1 FROM silver.loc_theme WHERE
      theme_id !~ '^theme-[1-8]
      OR theme_order <> split_part(theme_id,'-',2)::int
  ) THEN RAISE EXCEPTION 'Theme numeric identity validation failed'; END IF;
END $identity$;
ALTER TABLE silver.loc_theme DROP CONSTRAINT loc_theme_id_check;
ALTER TABLE silver.loc_theme
  ALTER COLUMN theme_id TYPE smallint USING split_part(theme_id,'-',2)::smallint;
ALTER TABLE silver.loc_theme
  ADD CONSTRAINT loc_theme_id_check CHECK (theme_id BETWEEN 1 AND 8);
ALTER TABLE silver.loc_theme DROP COLUMN theme_attr;
ALTER TABLE silver.loc_theme DROP COLUMN IF EXISTS theme_group;
