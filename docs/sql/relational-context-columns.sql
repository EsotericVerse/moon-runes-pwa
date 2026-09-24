-- One-time relational backfill for current Context, Culture, and Ranking readers.
-- Runtime reads must use the new scalar columns below, never payload.
-- Legacy extraction stays inside PostgreSQL; it does not return documents to clients.
-- After the runtime cutover, a follow-up migration removes payload from API views
-- and drops the retired JSONB columns.

ALTER TABLE silver.runes_context_entries
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS node_type text,
  ADD COLUMN IF NOT EXISTS entry_scope text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS context_date text,
  ADD COLUMN IF NOT EXISTS date_status text,
  ADD COLUMN IF NOT EXISTS anchor_id text,
  ADD COLUMN IF NOT EXISTS before_id text,
  ADD COLUMN IF NOT EXISTS after_id text,
  ADD COLUMN IF NOT EXISTS order_no numeric,
  ADD COLUMN IF NOT EXISTS rune_count integer,
  ADD COLUMN IF NOT EXISTS rune_number integer,
  ADD COLUMN IF NOT EXISTS literature_id text,
  ADD COLUMN IF NOT EXISTS work_id text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS milestone text,
  ADD COLUMN IF NOT EXISTS style_prompt text,
  ADD COLUMN IF NOT EXISTS ranking_types text[];

UPDATE silver.runes_context_entries
SET kind=payload->>'kind', node_type=payload->>'node_type',
    entry_scope=payload->>'scope_id', description=payload->>'description',
    context_date=payload->>'date', date_status=payload->>'date_status',
    anchor_id=payload->>'anchor_id', before_id=payload->>'before',
    after_id=payload->>'after', order_no=NULLIF(payload->>'order','')::numeric,
    rune_count=NULLIF(payload->>'rune_count','')::integer,
    rune_number=NULLIF(payload->>'rune_number','')::integer,
    literature_id=payload->>'literature_id', work_id=payload->>'work_id',
    status=payload->>'status', milestone=payload->>'milestone',
    style_prompt=payload->>'style_prompt',
    ranking_types=ARRAY(SELECT jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(payload->'ranking_types')='array' THEN payload->'ranking_types' ELSE '[]'::jsonb END
    ));

ALTER TABLE silver.lo3rwang_period_context_entries
  ADD COLUMN IF NOT EXISTS era_id text,
  ADD COLUMN IF NOT EXISTS period text,
  ADD COLUMN IF NOT EXISTS entry_name text,
  ADD COLUMN IF NOT EXISTS start_date text,
  ADD COLUMN IF NOT EXISTS end_date text,
  ADD COLUMN IF NOT EXISTS order_no numeric,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS anchor_id text,
  ADD COLUMN IF NOT EXISTS start_anchor_id text,
  ADD COLUMN IF NOT EXISTS end_anchor_id text,
  ADD COLUMN IF NOT EXISTS date_value text,
  ADD COLUMN IF NOT EXISTS date_status text,
  ADD COLUMN IF NOT EXISTS entry_scope text,
  ADD COLUMN IF NOT EXISTS visibility text,
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS year_value integer;

UPDATE silver.lo3rwang_period_context_entries
SET era_id=payload->>'era_id', period=payload->>'period', entry_name=payload->>'name',
    start_date=payload->>'start_date', end_date=payload->>'end_date',
    order_no=NULLIF(payload->>'order','')::numeric, status=payload->>'status',
    anchor_id=payload->>'anchor_id', start_anchor_id=payload->>'start_anchor_id',
    end_anchor_id=payload->>'end_anchor_id', date_value=payload->>'date',
    date_status=payload->>'date_status', entry_scope=payload->>'scope_id',
    visibility=payload->>'visibility', event_id=payload->>'event_id',
    year_value=NULLIF(payload->>'year','')::integer;

ALTER TABLE silver.runes_rankings ADD COLUMN IF NOT EXISTS source text;
UPDATE silver.runes_rankings SET source=payload->>'source';

ALTER TABLE silver.lo3rwang_rankings
  ADD COLUMN IF NOT EXISTS period text,
  ADD COLUMN IF NOT EXISTS hit_count bigint,
  ADD COLUMN IF NOT EXISTS percent numeric;

UPDATE silver.lo3rwang_rankings
SET period=payload->>'period',
    hit_count=NULLIF(payload->>'hit_count','')::bigint,
    percent=NULLIF(payload->>'percent','')::numeric;

CREATE OR REPLACE VIEW api.runes_context_entries AS
 SELECT context_key,context_type,title,summary,payload,updated_at,
 kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,
 order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types
 FROM silver.runes_context_entries;

CREATE OR REPLACE VIEW api.lo3rwang_context_entries AS
 SELECT context_key,context_type,title,summary,payload,updated_at,
 era_id,period,entry_name,start_date,end_date,order_no,status,anchor_id,start_anchor_id,
 end_anchor_id,date_value,date_status,entry_scope,visibility,event_id,year_value
 FROM silver.lo3rwang_period_context_entries;

CREATE OR REPLACE VIEW api.loc_context_entries AS
 SELECT 'runes'::text AS scope_id, context_key,context_type,title,summary,payload,updated_at,
 kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,
 order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,
 NULL::text AS era_id,NULL::text AS period,NULL::text AS entry_name,NULL::text AS start_date,
 NULL::text AS end_date,NULL::text AS start_anchor_id,NULL::text AS end_anchor_id,
 NULL::text AS date_value,NULL::text AS visibility,NULL::text AS event_id,NULL::integer AS year_value
 FROM silver.runes_context_entries
 UNION ALL
 SELECT 'lo3rwang'::text AS scope_id, context_key,context_type,title,summary,payload,updated_at,
 NULL::text AS kind,NULL::text AS node_type,entry_scope,NULL::text AS description,
 NULL::text AS context_date,date_status,anchor_id,NULL::text AS before_id,NULL::text AS after_id,
 order_no,NULL::integer AS rune_count,NULL::integer AS rune_number,NULL::text AS literature_id,
 NULL::text AS work_id,status,NULL::text AS milestone,NULL::text AS style_prompt,NULL::text[] AS ranking_types,
 era_id,period,entry_name,start_date,end_date,start_anchor_id,end_anchor_id,date_value,visibility,event_id,year_value
 FROM silver.lo3rwang_period_context_entries;

CREATE OR REPLACE VIEW api.runes_rankings AS
 SELECT ranking_key,ranking_type,term,rank_value,item_count,payload,updated_at,source
 FROM silver.runes_rankings;

CREATE OR REPLACE VIEW api.lo3rwang_rankings AS
 SELECT ranking_key,ranking_type,term,rank_value,item_count,payload,updated_at,period,hit_count,percent
 FROM silver.lo3rwang_rankings;

CREATE OR REPLACE VIEW api.loc_rankings AS
 SELECT 'runes'::text AS scope_id,r.ranking_key,r.ranking_type,r.term,r.rank_value,r.item_count,r.payload,r.updated_at,
 NULL::text AS period,NULL::bigint AS hit_count,NULL::numeric AS percent,r.source
 FROM silver.runes_rankings r
 UNION ALL
 SELECT 'lo3rwang'::text AS scope_id,p.ranking_key,p.ranking_type,p.term,p.rank_value,p.item_count,p.payload,p.updated_at,
 p.period,p.hit_count,p.percent,NULL::text AS source
 FROM silver.lo3rwang_rankings p;
