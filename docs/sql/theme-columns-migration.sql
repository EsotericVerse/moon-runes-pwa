-- Historical prerequisite: apply before silver-loc-scope-consolidation.sql.
-- After consolidation, default_theme_id lives on silver.loc_scope.
-- Theme settings use scalar columns only.
-- Apply through the Neon prepared-migration workflow.
ALTER TABLE api.site_theme_styles
  ADD COLUMN background_color text,
  ADD COLUMN panel_background_color text,
  ADD COLUMN text_color text;

UPDATE api.site_theme_styles
SET background_color = COALESCE(css_vars->>'--loc-bg', CASE style_key
      WHEN 'soul' THEN '#05060d' WHEN 'link' THEN '#edf7ff'
      WHEN 'life' THEN '#ff8a00' WHEN 'nature' THEN '#4c9a5a'
      WHEN 'mineral' THEN '#c7cdd3' WHEN 'element' THEN '#240606'
      WHEN 'order' THEN '#ffffff' WHEN 'disorder' THEN '#6b3e2e' END),
    panel_background_color = COALESCE(css_vars->>'--loc-panel', CASE style_key
      WHEN 'soul' THEN '#0b0d18' WHEN 'link' THEN '#f8fcff'
      WHEN 'life' THEN '#fff1dc' WHEN 'nature' THEN '#e7f5e9'
      WHEN 'mineral' THEN '#eef1f4' WHEN 'element' THEN '#3a0b0b'
      WHEN 'order' THEN '#ffffff' WHEN 'disorder' THEN '#4a281f' END),
    text_color = COALESCE(css_vars->>'--loc-text', CASE style_key
      WHEN 'soul' THEN '#f4f1ff' WHEN 'link' THEN '#17334a'
      WHEN 'life' THEN '#4a2508' WHEN 'nature' THEN '#12351f'
      WHEN 'mineral' THEN '#27313a' WHEN 'element' THEN '#fff5f5'
      WHEN 'order' THEN '#202020' WHEN 'disorder' THEN '#fff3eb' END);

ALTER TABLE api.site_theme_styles
  ALTER COLUMN background_color SET NOT NULL,
  ALTER COLUMN panel_background_color SET NOT NULL,
  ALTER COLUMN text_color SET NOT NULL,
  DROP COLUMN css_vars,
  DROP COLUMN legacy_mode,
  DROP COLUMN enabled;

ALTER TABLE silver.loc_scope_registry
  ADD COLUMN default_theme_id text NOT NULL DEFAULT 'theme-7',
  ADD CONSTRAINT loc_scope_registry_default_theme_id_check
    CHECK (default_theme_id IN ('theme-1','theme-2','theme-3','theme-4','theme-5','theme-6','theme-7','theme-8'));

UPDATE silver.loc_scope_registry AS registry
SET default_theme_id = COALESCE(old.theme, CASE WHEN registry.scope_id='moon-runes' THEN 'theme-5' ELSE 'theme-7' END)
FROM (VALUES
  ('loc','loc'),
  ('moon-runes','runes'),
  ('lo3rwang','lo3rwang'),
  ('lo3rwang_galaxy','lo3rwang_galaxy')
) AS mapping(registry_scope_id, old_scope_id)
LEFT JOIN api.scope_theme_defaults AS old ON old.scope_id = mapping.old_scope_id
WHERE registry.scope_id = mapping.registry_scope_id;

DROP TABLE api.scope_theme_defaults;

ALTER TABLE silver.loc_scope_registry ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE silver.loc_scope_registry TO anonymous, authenticated;
GRANT UPDATE (default_theme_id,updated_at) ON TABLE silver.loc_scope_registry TO authenticated;
CREATE POLICY loc_scope_registry_public_read ON silver.loc_scope_registry
  FOR SELECT TO anonymous, authenticated USING (true);
CREATE POLICY loc_scope_registry_manager_theme_update ON silver.loc_scope_registry
  FOR UPDATE TO authenticated
  USING (api.can_manage_scope_page(scope_id))
  WITH CHECK (api.can_manage_scope_page(scope_id));
