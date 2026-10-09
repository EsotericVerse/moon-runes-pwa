-- Admin system settings: canonical LOC Theme Registry and explicit database migration/deployment targets.

CREATE TABLE IF NOT EXISTS "silver"."loc_theme" (
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
  CONSTRAINT "loc_theme_pkey" PRIMARY KEY (theme_id),
  CONSTRAINT "loc_theme_id_check" CHECK (theme_id BETWEEN 1 AND 8),
  CONSTRAINT "loc_theme_scheme_check" CHECK (scheme IN ('dark','light')),
  CONSTRAINT "loc_theme_order_check" CHECK (theme_order >= 1 AND theme_order <= 8)
);

alter table silver.loc_theme enable row level security;
drop policy if exists loc_theme_public_read on silver.loc_theme;
drop policy if exists loc_theme_admin_write on silver.loc_theme;
create policy loc_theme_public_read on silver.loc_theme
  for select to anonymous,authenticated using (true);
create policy loc_theme_admin_write on silver.loc_theme
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select on silver.loc_theme to anonymous,authenticated;
grant insert,update,delete on silver.loc_theme to authenticated;

create table if not exists silver.database_targets (
  target_id text primary key,
  provider text not null check (provider in ('supabase','neon')),
  label text not null,
  project_id text,
  project_url text not null,
  selected boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists database_targets_one_selected
  on silver.database_targets((selected)) where selected;

alter table silver.database_targets enable row level security;
drop policy if exists database_targets_admin_all on silver.database_targets;
create policy database_targets_admin_all on silver.database_targets
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select,insert,update,delete on silver.database_targets to authenticated;

insert into silver.database_targets(target_id,provider,label,project_id,project_url,selected)
values
 ('supabase-current','supabase','Supabase · loc-postgres-portability','qlouywsdiiyiyzpoxyqy','https://qlouywsdiiyiyzpoxyqy.supabase.co',true),
 ('neon-current','neon','Neon · backup',null,'https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1',false)
on conflict(target_id) do nothing;
),
  theme_name text not null,
  theme_order integer not null,
  scheme text not null check (scheme in ('light','dark')),
  style_key text not null,
  identity_color text not null,
  loc_bg text not null,
  loc_panel text not null,
  loc_panel_2 text not null,
  loc_panel_strong text not null,
  loc_panel_nav text not null,
  loc_panel_tab text not null,
  loc_rune_bg text not null,
  loc_rune_selected_bg text not null,
  loc_line text not null,
  loc_line_soft text not null,
  loc_line_softer text not null,
  loc_line_faint text not null,
  loc_text text not null,
  loc_muted text not null,
  loc_heading text not null,
  loc_accent text not null,
  loc_gold text not null,
  loc_danger text not null,
  loc_surface text not null,
  loc_surface_soft text not null,
  loc_surface_faint text not null,
  loc_surface_status text not null,
  loc_accent_surface text not null,
  loc_accent_surface_strong text not null,
  loc_accent_border text not null,
  loc_accent_border_soft text not null,
  loc_accent_border_faint text not null,
  loc_gold_surface text not null,
  loc_gold_surface_soft text not null,
  loc_gold_border text not null,
  loc_gold_border_soft text not null,
  loc_gold_border_faint text not null,
  loc_gold_ring text not null,
  loc_gold_ring_soft text not null,
  loc_danger_border text not null,
  loc_primary_start text not null,
  loc_primary_end text not null,
  loc_body_glow text not null,
  loc_body_mid text not null,
  loc_hero_start text not null,
  loc_hero_end text not null,
  loc_shadow text not null,
  loc_shadow_card text not null
);

alter table silver.loc_theme enable row level security;
drop policy if exists loc_theme_public_read on silver.loc_theme;
drop policy if exists loc_theme_admin_write on silver.loc_theme;
create policy loc_theme_public_read on silver.loc_theme
  for select to anonymous,authenticated using (true);
create policy loc_theme_admin_write on silver.loc_theme
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select on silver.loc_theme to anonymous,authenticated;
grant insert,update,delete on silver.loc_theme to authenticated;

create table if not exists silver.database_targets (
  target_id text primary key,
  provider text not null check (provider in ('supabase','neon')),
  label text not null,
  project_id text,
  project_url text not null,
  selected boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists database_targets_one_selected
  on silver.database_targets((selected)) where selected;

alter table silver.database_targets enable row level security;
drop policy if exists database_targets_admin_all on silver.database_targets;
create policy database_targets_admin_all on silver.database_targets
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select,insert,update,delete on silver.database_targets to authenticated;

insert into silver.database_targets(target_id,provider,label,project_id,project_url,selected)
values
 ('supabase-current','supabase','Supabase · loc-postgres-portability','qlouywsdiiyiyzpoxyqy','https://qlouywsdiiyiyzpoxyqy.supabase.co',true),
 ('neon-current','neon','Neon · backup',null,'https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1',false)
on conflict(target_id) do nothing;
