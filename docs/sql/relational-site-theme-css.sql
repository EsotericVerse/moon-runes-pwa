-- Store theme CSS variables as PostgreSQL text[] entries (key=value), not JSONB.
alter table api.site_theme_styles add column css_vars_sql text[] not null default '{}'::text[];
update api.site_theme_styles s
set css_vars_sql=coalesce(
  array(
    select item.key||'='||item.value
    from jsonb_each_text(s.css_vars) item
    order by item.key
  ),
  '{}'::text[]
);
alter table api.site_theme_styles drop column css_vars;
alter table api.site_theme_styles rename column css_vars_sql to css_vars;
