-- Preserve the original Theme 8 at governance/backups/theme-8-before-graphite-20261008.json.
-- Converts all 43 theme color/shadow tokens to graphite gray while retaining Scheme dark.
-- Danger (error) contrast remains distinctly red by design.
-- Update is snapshot-guarded, atomic, and scoped to theme-8 only.
do $graphite$
declare
  modified_rows integer;
  token_count integer;
  light_count integer;
  dark_count integer;
begin
  update silver.loc_theme
  set theme_attr=jsonb_set(
    jsonb_set(theme_attr,'{tokens}','{"--loc-bg":"#30363b","--loc-panel":"#444b51","--loc-panel-2":"#59636b","--loc-panel-strong":"rgba(68,75,81,.97)","--loc-panel-nav":"rgba(40,46,51,.97)","--loc-panel-tab":"rgba(79,88,95,.95)","--loc-rune-bg":"#363e44","--loc-rune-selected-bg":"#647078","--loc-line":"rgba(177,192,202,.31)","--loc-line-soft":"rgba(177,192,202,.15)","--loc-line-softer":"rgba(177,192,202,.18)","--loc-line-faint":"rgba(177,192,202,.20)","--loc-text":"#f0f1ee","--loc-muted":"#c4cdd0","--loc-heading":"#ffffff","--loc-accent":"#b6c4cc","--loc-gold":"#d9dde0","--loc-danger":"#ffb0b8","--loc-surface":"rgba(68,75,81,.95)","--loc-surface-soft":"rgba(185,198,206,.075)","--loc-surface-faint":"rgba(185,198,206,.042)","--loc-surface-status":"rgba(185,198,206,.09)","--loc-accent-surface":"rgba(182,196,204,.13)","--loc-accent-surface-strong":"rgba(182,196,204,.25)","--loc-accent-border":"rgba(182,196,204,.64)","--loc-accent-border-soft":"rgba(182,196,204,.48)","--loc-accent-border-faint":"rgba(182,196,204,.35)","--loc-gold-surface":"rgba(217,221,224,.11)","--loc-gold-surface-soft":"rgba(217,221,224,.07)","--loc-gold-border":"rgba(217,221,224,.64)","--loc-gold-border-soft":"rgba(217,221,224,.48)","--loc-gold-border-faint":"rgba(217,221,224,.36)","--loc-gold-ring":"rgba(217,221,224,.30)","--loc-gold-ring-soft":"rgba(217,221,224,.18)","--loc-danger-border":"rgba(255,176,184,.38)","--loc-primary-start":"#59636b","--loc-primary-end":"#444b51","--loc-body-glow":"#56616a","--loc-body-mid":"#272d32","--loc-hero-start":"rgba(89,99,107,.96)","--loc-hero-end":"rgba(39,45,50,.98)","--loc-shadow":"0 20px 55px rgba(0,0,0,.36)","--loc-shadow-card":"0 12px 35px rgba(0,0,0,.24)"}'::jsonb,true),
    '{identity_color}','"#30363b"'::jsonb,true
  )
  where theme_id='theme-8' and theme_name='無序'
    and theme_order=8
    and theme_attr='{"group":"無序","scheme":"dark","tokens":{"--loc-bg":"#6b3e2e","--loc-gold":"#e2a77e","--loc-line":"rgba(238,190,157,.30)","--loc-text":"#fff3eb","--loc-muted":"#e0b9a5","--loc-panel":"#4a281f","--loc-accent":"#d48d69","--loc-danger":"#ffb9a3","--loc-shadow":"0 20px 55px rgba(43,23,18,.34)","--loc-heading":"#fffaf6","--loc-panel-2":"#6f3f2e","--loc-rune-bg":"#3d211a","--loc-surface":"rgba(74,40,31,.94)","--loc-body-mid":"#2b1712","--loc-hero-end":"rgba(43,23,18,.98)","--loc-body-glow":"#754331","--loc-gold-ring":"rgba(226,167,126,.30)","--loc-line-soft":"rgba(238,190,157,.15)","--loc-panel-nav":"rgba(55,29,23,.98)","--loc-panel-tab":"rgba(111,63,46,.94)","--loc-hero-start":"rgba(112,61,43,.96)","--loc-line-faint":"rgba(238,190,157,.20)","--loc-gold-border":"rgba(226,167,126,.64)","--loc-line-softer":"rgba(238,190,157,.18)","--loc-primary-end":"#5c3024","--loc-shadow-card":"0 12px 35px rgba(43,23,18,.22)","--loc-gold-surface":"rgba(226,167,126,.12)","--loc-panel-strong":"rgba(74,40,31,.96)","--loc-surface-soft":"rgba(238,190,157,.06)","--loc-accent-border":"rgba(212,141,105,.62)","--loc-danger-border":"rgba(255,185,163,.38)","--loc-primary-start":"#875039","--loc-surface-faint":"rgba(238,190,157,.035)","--loc-accent-surface":"rgba(212,141,105,.12)","--loc-gold-ring-soft":"rgba(226,167,126,.18)","--loc-surface-status":"rgba(238,190,157,.07)","--loc-gold-border-soft":"rgba(226,167,126,.48)","--loc-rune-selected-bg":"#875039","--loc-gold-border-faint":"rgba(226,167,126,.36)","--loc-gold-surface-soft":"rgba(226,167,126,.08)","--loc-accent-border-soft":"rgba(212,141,105,.46)","--loc-accent-border-faint":"rgba(212,141,105,.34)","--loc-accent-surface-strong":"rgba(212,141,105,.22)"},"style_key":"disorder","identity_color":"#6b3e2e"}'::jsonb;
  get diagnostics modified_rows=row_count;
  if modified_rows<>1 then
    raise exception 'Theme 8 changed since backup, refusing to overwrite';
  end if;
  select count(*) into token_count from silver.loc_theme t,
    lateral jsonb_object_keys(t.theme_attr->'tokens') v where t.theme_id='theme-8';
  if token_count<>43 then
    raise exception 'Theme 8 must retain 43 tokens, found %',token_count;
  end if;
  select count(*) filter (where theme_attr->>'scheme'='light'),
         count(*) filter (where theme_attr->>'scheme'='dark')
  into light_count,dark_count from silver.loc_theme;
  if light_count<>4 or dark_count<>4 then
    raise exception 'Expected 4 Light and 4 Dark themes, got % Light and % Dark',light_count,dark_count;
  end if;
end $graphite$;
