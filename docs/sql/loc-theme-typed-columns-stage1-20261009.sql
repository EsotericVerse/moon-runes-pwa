-- Phase 1: add explicit scalar Theme columns without interrupting the deployed JSONB reader.
-- Phase 2 drops theme_attr after the new code is deployed and verified.
ALTER TABLE silver.loc_theme
ADD COLUMN IF NOT EXISTS scheme text,
  ADD COLUMN IF NOT EXISTS style_key text,
  ADD COLUMN IF NOT EXISTS identity_color text,
  ADD COLUMN IF NOT EXISTS loc_bg text,
  ADD COLUMN IF NOT EXISTS loc_panel text,
  ADD COLUMN IF NOT EXISTS loc_panel_2 text,
  ADD COLUMN IF NOT EXISTS loc_panel_strong text,
  ADD COLUMN IF NOT EXISTS loc_panel_nav text,
  ADD COLUMN IF NOT EXISTS loc_panel_tab text,
  ADD COLUMN IF NOT EXISTS loc_rune_bg text,
  ADD COLUMN IF NOT EXISTS loc_rune_selected_bg text,
  ADD COLUMN IF NOT EXISTS loc_line text,
  ADD COLUMN IF NOT EXISTS loc_line_soft text,
  ADD COLUMN IF NOT EXISTS loc_line_softer text,
  ADD COLUMN IF NOT EXISTS loc_line_faint text,
  ADD COLUMN IF NOT EXISTS loc_text text,
  ADD COLUMN IF NOT EXISTS loc_muted text,
  ADD COLUMN IF NOT EXISTS loc_heading text,
  ADD COLUMN IF NOT EXISTS loc_accent text,
  ADD COLUMN IF NOT EXISTS loc_gold text,
  ADD COLUMN IF NOT EXISTS loc_danger text,
  ADD COLUMN IF NOT EXISTS loc_surface text,
  ADD COLUMN IF NOT EXISTS loc_surface_soft text,
  ADD COLUMN IF NOT EXISTS loc_surface_faint text,
  ADD COLUMN IF NOT EXISTS loc_surface_status text,
  ADD COLUMN IF NOT EXISTS loc_accent_surface text,
  ADD COLUMN IF NOT EXISTS loc_accent_surface_strong text,
  ADD COLUMN IF NOT EXISTS loc_accent_border text,
  ADD COLUMN IF NOT EXISTS loc_accent_border_soft text,
  ADD COLUMN IF NOT EXISTS loc_accent_border_faint text,
  ADD COLUMN IF NOT EXISTS loc_gold_surface text,
  ADD COLUMN IF NOT EXISTS loc_gold_surface_soft text,
  ADD COLUMN IF NOT EXISTS loc_gold_border text,
  ADD COLUMN IF NOT EXISTS loc_gold_border_soft text,
  ADD COLUMN IF NOT EXISTS loc_gold_border_faint text,
  ADD COLUMN IF NOT EXISTS loc_gold_ring text,
  ADD COLUMN IF NOT EXISTS loc_gold_ring_soft text,
  ADD COLUMN IF NOT EXISTS loc_danger_border text,
  ADD COLUMN IF NOT EXISTS loc_primary_start text,
  ADD COLUMN IF NOT EXISTS loc_primary_end text,
  ADD COLUMN IF NOT EXISTS loc_body_glow text,
  ADD COLUMN IF NOT EXISTS loc_body_mid text,
  ADD COLUMN IF NOT EXISTS loc_hero_start text,
  ADD COLUMN IF NOT EXISTS loc_hero_end text,
  ADD COLUMN IF NOT EXISTS loc_shadow text,
  ADD COLUMN IF NOT EXISTS loc_shadow_card text;
UPDATE silver.loc_theme SET
scheme=theme_attr->>'scheme',
  style_key=theme_attr->>'style_key',
  identity_color=theme_attr->>'identity_color',
  loc_bg=theme_attr->'tokens'->>'--loc-bg',
  loc_panel=theme_attr->'tokens'->>'--loc-panel',
  loc_panel_2=theme_attr->'tokens'->>'--loc-panel-2',
  loc_panel_strong=theme_attr->'tokens'->>'--loc-panel-strong',
  loc_panel_nav=theme_attr->'tokens'->>'--loc-panel-nav',
  loc_panel_tab=theme_attr->'tokens'->>'--loc-panel-tab',
  loc_rune_bg=theme_attr->'tokens'->>'--loc-rune-bg',
  loc_rune_selected_bg=theme_attr->'tokens'->>'--loc-rune-selected-bg',
  loc_line=theme_attr->'tokens'->>'--loc-line',
  loc_line_soft=theme_attr->'tokens'->>'--loc-line-soft',
  loc_line_softer=theme_attr->'tokens'->>'--loc-line-softer',
  loc_line_faint=theme_attr->'tokens'->>'--loc-line-faint',
  loc_text=theme_attr->'tokens'->>'--loc-text',
  loc_muted=theme_attr->'tokens'->>'--loc-muted',
  loc_heading=theme_attr->'tokens'->>'--loc-heading',
  loc_accent=theme_attr->'tokens'->>'--loc-accent',
  loc_gold=theme_attr->'tokens'->>'--loc-gold',
  loc_danger=theme_attr->'tokens'->>'--loc-danger',
  loc_surface=theme_attr->'tokens'->>'--loc-surface',
  loc_surface_soft=theme_attr->'tokens'->>'--loc-surface-soft',
  loc_surface_faint=theme_attr->'tokens'->>'--loc-surface-faint',
  loc_surface_status=theme_attr->'tokens'->>'--loc-surface-status',
  loc_accent_surface=theme_attr->'tokens'->>'--loc-accent-surface',
  loc_accent_surface_strong=theme_attr->'tokens'->>'--loc-accent-surface-strong',
  loc_accent_border=theme_attr->'tokens'->>'--loc-accent-border',
  loc_accent_border_soft=theme_attr->'tokens'->>'--loc-accent-border-soft',
  loc_accent_border_faint=theme_attr->'tokens'->>'--loc-accent-border-faint',
  loc_gold_surface=theme_attr->'tokens'->>'--loc-gold-surface',
  loc_gold_surface_soft=theme_attr->'tokens'->>'--loc-gold-surface-soft',
  loc_gold_border=theme_attr->'tokens'->>'--loc-gold-border',
  loc_gold_border_soft=theme_attr->'tokens'->>'--loc-gold-border-soft',
  loc_gold_border_faint=theme_attr->'tokens'->>'--loc-gold-border-faint',
  loc_gold_ring=theme_attr->'tokens'->>'--loc-gold-ring',
  loc_gold_ring_soft=theme_attr->'tokens'->>'--loc-gold-ring-soft',
  loc_danger_border=theme_attr->'tokens'->>'--loc-danger-border',
  loc_primary_start=theme_attr->'tokens'->>'--loc-primary-start',
  loc_primary_end=theme_attr->'tokens'->>'--loc-primary-end',
  loc_body_glow=theme_attr->'tokens'->>'--loc-body-glow',
  loc_body_mid=theme_attr->'tokens'->>'--loc-body-mid',
  loc_hero_start=theme_attr->'tokens'->>'--loc-hero-start',
  loc_hero_end=theme_attr->'tokens'->>'--loc-hero-end',
  loc_shadow=theme_attr->'tokens'->>'--loc-shadow',
  loc_shadow_card=theme_attr->'tokens'->>'--loc-shadow-card';
DO $verify$ BEGIN
 IF (SELECT count(*) FROM silver.loc_theme)<>8 THEN RAISE EXCEPTION 'Theme row count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM silver.loc_theme WHERE
coalesce(scheme,'') NOT IN ('light','dark')
  OR coalesce(style_key,'')=''
  OR coalesce(identity_color,'')=''
  OR theme_attr->>'group' IS DISTINCT FROM theme_name
  OR coalesce(loc_bg,'')=''
  OR coalesce(loc_panel,'')=''
  OR coalesce(loc_panel_2,'')=''
  OR coalesce(loc_panel_strong,'')=''
  OR coalesce(loc_panel_nav,'')=''
  OR coalesce(loc_panel_tab,'')=''
  OR coalesce(loc_rune_bg,'')=''
  OR coalesce(loc_rune_selected_bg,'')=''
  OR coalesce(loc_line,'')=''
  OR coalesce(loc_line_soft,'')=''
  OR coalesce(loc_line_softer,'')=''
  OR coalesce(loc_line_faint,'')=''
  OR coalesce(loc_text,'')=''
  OR coalesce(loc_muted,'')=''
  OR coalesce(loc_heading,'')=''
  OR coalesce(loc_accent,'')=''
  OR coalesce(loc_gold,'')=''
  OR coalesce(loc_danger,'')=''
  OR coalesce(loc_surface,'')=''
  OR coalesce(loc_surface_soft,'')=''
  OR coalesce(loc_surface_faint,'')=''
  OR coalesce(loc_surface_status,'')=''
  OR coalesce(loc_accent_surface,'')=''
  OR coalesce(loc_accent_surface_strong,'')=''
  OR coalesce(loc_accent_border,'')=''
  OR coalesce(loc_accent_border_soft,'')=''
  OR coalesce(loc_accent_border_faint,'')=''
  OR coalesce(loc_gold_surface,'')=''
  OR coalesce(loc_gold_surface_soft,'')=''
  OR coalesce(loc_gold_border,'')=''
  OR coalesce(loc_gold_border_soft,'')=''
  OR coalesce(loc_gold_border_faint,'')=''
  OR coalesce(loc_gold_ring,'')=''
  OR coalesce(loc_gold_ring_soft,'')=''
  OR coalesce(loc_danger_border,'')=''
  OR coalesce(loc_primary_start,'')=''
  OR coalesce(loc_primary_end,'')=''
  OR coalesce(loc_body_glow,'')=''
  OR coalesce(loc_body_mid,'')=''
  OR coalesce(loc_hero_start,'')=''
  OR coalesce(loc_hero_end,'')=''
  OR coalesce(loc_shadow,'')=''
  OR coalesce(loc_shadow_card,'')='') THEN RAISE EXCEPTION 'Theme migration data is incomplete'; END IF;
END $verify$;
ALTER TABLE silver.loc_theme
ALTER COLUMN scheme SET NOT NULL,
  ALTER COLUMN style_key SET NOT NULL,
  ALTER COLUMN identity_color SET NOT NULL,
  ALTER COLUMN loc_bg SET NOT NULL,
  ALTER COLUMN loc_panel SET NOT NULL,
  ALTER COLUMN loc_panel_2 SET NOT NULL,
  ALTER COLUMN loc_panel_strong SET NOT NULL,
  ALTER COLUMN loc_panel_nav SET NOT NULL,
  ALTER COLUMN loc_panel_tab SET NOT NULL,
  ALTER COLUMN loc_rune_bg SET NOT NULL,
  ALTER COLUMN loc_rune_selected_bg SET NOT NULL,
  ALTER COLUMN loc_line SET NOT NULL,
  ALTER COLUMN loc_line_soft SET NOT NULL,
  ALTER COLUMN loc_line_softer SET NOT NULL,
  ALTER COLUMN loc_line_faint SET NOT NULL,
  ALTER COLUMN loc_text SET NOT NULL,
  ALTER COLUMN loc_muted SET NOT NULL,
  ALTER COLUMN loc_heading SET NOT NULL,
  ALTER COLUMN loc_accent SET NOT NULL,
  ALTER COLUMN loc_gold SET NOT NULL,
  ALTER COLUMN loc_danger SET NOT NULL,
  ALTER COLUMN loc_surface SET NOT NULL,
  ALTER COLUMN loc_surface_soft SET NOT NULL,
  ALTER COLUMN loc_surface_faint SET NOT NULL,
  ALTER COLUMN loc_surface_status SET NOT NULL,
  ALTER COLUMN loc_accent_surface SET NOT NULL,
  ALTER COLUMN loc_accent_surface_strong SET NOT NULL,
  ALTER COLUMN loc_accent_border SET NOT NULL,
  ALTER COLUMN loc_accent_border_soft SET NOT NULL,
  ALTER COLUMN loc_accent_border_faint SET NOT NULL,
  ALTER COLUMN loc_gold_surface SET NOT NULL,
  ALTER COLUMN loc_gold_surface_soft SET NOT NULL,
  ALTER COLUMN loc_gold_border SET NOT NULL,
  ALTER COLUMN loc_gold_border_soft SET NOT NULL,
  ALTER COLUMN loc_gold_border_faint SET NOT NULL,
  ALTER COLUMN loc_gold_ring SET NOT NULL,
  ALTER COLUMN loc_gold_ring_soft SET NOT NULL,
  ALTER COLUMN loc_danger_border SET NOT NULL,
  ALTER COLUMN loc_primary_start SET NOT NULL,
  ALTER COLUMN loc_primary_end SET NOT NULL,
  ALTER COLUMN loc_body_glow SET NOT NULL,
  ALTER COLUMN loc_body_mid SET NOT NULL,
  ALTER COLUMN loc_hero_start SET NOT NULL,
  ALTER COLUMN loc_hero_end SET NOT NULL,
  ALTER COLUMN loc_shadow SET NOT NULL,
  ALTER COLUMN loc_shadow_card SET NOT NULL;
ALTER TABLE silver.loc_theme ADD CONSTRAINT loc_theme_scheme_check CHECK(scheme IN ('light','dark'));
