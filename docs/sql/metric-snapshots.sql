-- RC6 Neon metric snapshot contract.
-- The refresh job owns the write path. Public Next runtime only SELECTs this
-- relation and never recomputes aggregate metrics in the browser.
create table if not exists silver.metric_snapshots (
  snapshot_id text primary key,
  scope_id text not null,
  metric_key text not null,
  metric_type text not null,
  ranking_key text,
  term text,
  metric_value numeric not null default 0,
  item_count bigint not null default 0,
  unit text not null default '',
  source_updated_at timestamptz not null,
  calculated_at timestamptz not null default now(),
  dimensions jsonb not null default '{}'::jsonb,
  unique (scope_id, metric_type, metric_key, dimensions)
);

create index if not exists metric_snapshots_scope_type_idx
  on silver.metric_snapshots (scope_id, metric_type, metric_key);

create index if not exists metric_snapshots_source_updated_idx
  on silver.metric_snapshots (source_updated_at);

-- Refresh writers pass the source watermark together with the already
-- computed COUNT / SUM / GROUP BY result.  An unchanged source is a no-op.
create or replace function silver.save_metric_snapshot(
  p_snapshot_id text,
  p_scope_id text,
  p_metric_key text,
  p_metric_type text,
  p_metric_value numeric,
  p_source_updated_at timestamptz,
  p_ranking_key text default null,
  p_term text default null,
  p_item_count bigint default 0,
  p_unit text default '',
  p_dimensions jsonb default '{}'::jsonb
) returns void
language sql
as $$
  insert into silver.metric_snapshots (
    snapshot_id, scope_id, metric_key, metric_type, ranking_key, term,
    metric_value, item_count, unit, source_updated_at, calculated_at, dimensions
  ) values (
    p_snapshot_id, p_scope_id, p_metric_key, p_metric_type, p_ranking_key,
    p_term, p_metric_value, p_item_count, p_unit, p_source_updated_at,
    now(), p_dimensions
  )
  on conflict (scope_id, metric_type, metric_key, dimensions)
  do update set
    snapshot_id=excluded.snapshot_id,
    ranking_key=excluded.ranking_key,
    term=excluded.term,
    metric_value=excluded.metric_value,
    item_count=excluded.item_count,
    unit=excluded.unit,
    source_updated_at=excluded.source_updated_at,
    calculated_at=excluded.calculated_at
  where excluded.source_updated_at > silver.metric_snapshots.source_updated_at;
$$;
