-- Remove the unused JSON dimensions from metric snapshots.
-- The table was confirmed empty before this migration.
drop function if exists silver.save_metric_snapshot(text, text, text, text, numeric, timestamptz, text, text, bigint, text, jsonb);
alter table silver.metric_snapshots
  drop constraint if exists metric_snapshots_scope_id_metric_type_metric_key_dimensions_key;
alter table silver.metric_snapshots drop column if exists dimensions;
alter table silver.metric_snapshots
  add constraint metric_snapshots_scope_type_key_unique unique (scope_id, metric_type, metric_key);
create function silver.save_metric_snapshot(
  p_snapshot_id text,
  p_scope_id text,
  p_metric_key text,
  p_metric_type text,
  p_metric_value numeric,
  p_source_updated_at timestamptz,
  p_ranking_key text default null,
  p_term text default null,
  p_item_count bigint default 0,
  p_unit text default ''
) returns void
language sql
as 'insert into silver.metric_snapshots (
  snapshot_id, scope_id, metric_key, metric_type, ranking_key, term,
  metric_value, item_count, unit, source_updated_at, calculated_at
) values (
  p_snapshot_id, p_scope_id, p_metric_key, p_metric_type, p_ranking_key,
  p_term, p_metric_value, p_item_count, p_unit, p_source_updated_at, now()
)
on conflict (scope_id, metric_type, metric_key)
do update set
  snapshot_id=excluded.snapshot_id,
  ranking_key=excluded.ranking_key,
  term=excluded.term,
  metric_value=excluded.metric_value,
  item_count=excluded.item_count,
  unit=excluded.unit,
  source_updated_at=excluded.source_updated_at,
  calculated_at=excluded.calculated_at
where excluded.source_updated_at > silver.metric_snapshots.source_updated_at';
