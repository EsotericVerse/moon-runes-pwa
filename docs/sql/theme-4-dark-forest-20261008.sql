-- Intentional, reversible Theme 4 visual experiment.
-- The complete original 8-theme snapshot is committed at:
-- governance/backups/loc-theme-20261008-before-four-four.json
-- Precondition: the existing Theme 4 must still match the saved snapshot.
-- Only silver.loc_theme.theme_id='theme-4' is modified.
-- Changes full 43-token palette and scheme together. No other Theme is affected.
do $theme4$
declare
  affected integer;
  new_token_count integer;
  dark_count integer;
  light_count integer;
begin
  update silver.loc_theme
  set theme_attr=jsonb_set(
    jsonb_set(theme_attr,'{scheme}','"dark"'::jsonb,true),
    '{tokens}',
    '{"--loc-bg":"#081b13","--loc-panel":"#122a20","--loc-panel-2":"#20412f","--loc-panel-strong":"rgba(18,42,32,.96)","--loc-panel-nav":"rgba(8,27,19,.97)","--loc-panel-tab":"rgba(32,65,47,.94)","--loc-rune-bg":"#10261b","--loc-rune-selected-bg":"#2b563f","--loc-line":"rgba(150,214,166,.28)","--loc-line-soft":"rgba(150,214,166,.14)","--loc-line-softer":"rgba(150,214,166,.18)","--loc-line-faint":"rgba(150,214,166,.20)","--loc-text":"#eef9f0","--loc-muted":"#b7d7c1","--loc-heading":"#ffffff","--loc-accent":"#88d3a4","--loc-gold":"#d6c887","--loc-danger":"#ffb0b8","--loc-surface":"rgba(18,42,32,.94)","--loc-surface-soft":"rgba(136,211,164,.06)","--loc-surface-faint":"rgba(136,211,164,.035)","--loc-surface-status":"rgba(136,211,164,.08)","--loc-accent-surface":"rgba(136,211,164,.13)","--loc-accent-surface-strong":"rgba(136,211,164,.25)","--loc-accent-border":"rgba(136,211,164,.62)","--loc-accent-border-soft":"rgba(136,211,164,.46)","--loc-accent-border-faint":"rgba(136,211,164,.34)","--loc-gold-surface":"rgba(214,200,135,.12)","--loc-gold-surface-soft":"rgba(214,200,135,.08)","--loc-gold-border":"rgba(214,200,135,.62)","--loc-gold-border-soft":"rgba(214,200,135,.48)","--loc-gold-border-faint":"rgba(214,200,135,.36)","--loc-gold-ring":"rgba(214,200,135,.30)","--loc-gold-ring-soft":"rgba(214,200,135,.18)","--loc-danger-border":"rgba(255,176,184,.38)","--loc-primary-start":"#285e42","--loc-primary-end":"#173a29","--loc-body-glow":"#174932","--loc-body-mid":"#0b2619","--loc-hero-start":"rgba(35,81,55,.95)","--loc-hero-end":"rgba(8,27,19,.98)","--loc-shadow":"0 20px 55px rgba(0,0,0,.35)","--loc-shadow-card":"0 12px 35px rgba(0,0,0,.23)"}'::jsonb,
    true
  )
  where theme_id='theme-4'
    and theme_name='自然'
    and theme_order=4
    and theme_attr='{"group":"自然","scheme":"light","tokens":{"--loc-bg":"#4c9a5a","--loc-gold":"#126329","--loc-line":"rgba(25,84,43,.28)","--loc-text":"#12351f","--loc-muted":"#2f6b3c","--loc-panel":"#e7f5e9","--loc-accent":"#187a36","--loc-danger":"#8f3141","--loc-shadow":"0 20px 55px rgba(25,84,43,.14)","--loc-heading":"#0b2b17","--loc-panel-2":"#a9d8ae","--loc-rune-bg":"#eef8f0","--loc-surface":"rgba(231,245,233,.92)","--loc-body-mid":"#eaf6ec","--loc-hero-end":"rgba(249,253,250,.98)","--loc-body-glow":"#c6e8cb","--loc-gold-ring":"rgba(18,99,41,.24)","--loc-line-soft":"rgba(25,84,43,.14)","--loc-panel-nav":"rgba(214,239,218,.97)","--loc-panel-tab":"rgba(203,231,207,.95)","--loc-hero-start":"rgba(201,235,207,.97)","--loc-line-faint":"rgba(25,84,43,.18)","--loc-gold-border":"rgba(18,99,41,.56)","--loc-line-softer":"rgba(25,84,43,.16)","--loc-primary-end":"#7fbd8b","--loc-shadow-card":"0 12px 35px rgba(25,84,43,.09)","--loc-gold-surface":"rgba(18,99,41,.09)","--loc-panel-strong":"rgba(231,245,233,.96)","--loc-surface-soft":"rgba(24,122,54,.045)","--loc-accent-border":"rgba(24,122,54,.56)","--loc-danger-border":"rgba(143,49,65,.28)","--loc-primary-start":"#a6d4ad","--loc-surface-faint":"rgba(24,122,54,.025)","--loc-accent-surface":"rgba(24,122,54,.09)","--loc-gold-ring-soft":"rgba(18,99,41,.14)","--loc-surface-status":"rgba(24,122,54,.06)","--loc-gold-border-soft":"rgba(18,99,41,.42)","--loc-rune-selected-bg":"#98cf9f","--loc-gold-border-faint":"rgba(18,99,41,.32)","--loc-gold-surface-soft":"rgba(18,99,41,.06)","--loc-accent-border-soft":"rgba(24,122,54,.42)","--loc-accent-border-faint":"rgba(24,122,54,.32)","--loc-accent-surface-strong":"rgba(24,122,54,.16)"},"style_key":"nature","identity_color":"#1f6b3a"}'::jsonb;

  get diagnostics affected=row_count;
  if affected<>1 then
    raise exception 'Theme 4 has changed since the archived snapshot, refusing to overwrite current colors';
  end if;

  select count(*) into new_token_count
  from silver.loc_theme t, lateral jsonb_object_keys(t.theme_attr->'tokens') as key
  where t.theme_id='theme-4';
  if new_token_count<>43 then
    raise exception 'Theme 4 must retain exactly 43 color tokens, got %',new_token_count;
  end if;

  select count(*) filter (where theme_attr->>'scheme'='dark'),
         count(*) filter (where theme_attr->>'scheme'='light')
  into dark_count,light_count
  from silver.loc_theme;
  if dark_count<>4 or light_count<>4 then
    raise exception 'Scheme distribution must be 4 dark / 4 light, got % dark / % light',dark_count,light_count;
  end if;
end
$theme4$;
