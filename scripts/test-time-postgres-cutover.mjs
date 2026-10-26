// Isolated PostgreSQL verification of the exact production Time migration.
// Only runs in the GitHub Actions disposable PostgreSQL service, NEVER Supabase.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const migration=fileURLToPath(new URL('../supabase/migrations/20261027160000_time_uid_dynamic_periods.sql',import.meta.url));
function psql({sql,filename}={}){
  const args=['-X','-v','ON_ERROR_STOP=1','-q'];
  if(filename)args.push('-f',filename);else args.push('-c',sql);
  return execFileSync('psql',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],
    env:{...process.env,PGHOST:process.env.PGHOST||'localhost',
      PGPORT:process.env.PGPORT||'5432',PGDATABASE:process.env.PGDATABASE||'postgres',
      PGUSER:process.env.PGUSER||'postgres',PGPASSWORD:process.env.PGPASSWORD||'postgres'}});
}
const table=scope=>`
CREATE TABLE silver.${scope}_time (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,
  resource_id text,
  label text,
  display_order integer,
  status text,
  note text,
  time_date date,
  anchor_ids text[],
  date_status text,
  year_value integer,
  visibility text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  style_description text,
  CONSTRAINT ${scope}_time_record_type_check
    CHECK (record_type IN ('anchor','period','event','style_comment')),
  CONSTRAINT ${scope}_time_record_type_resource_id_key
    UNIQUE (record_type,resource_id),
  CONSTRAINT ${scope}_time_style_comment_shape_check
    CHECK (record_type<>'style_comment' OR
      label IS NOT NULL AND style_description IS NOT NULL)
);
CREATE INDEX ${scope}_time_order_idx ON silver.${scope}_time(record_type,display_order);
CREATE INDEX ${scope}_time_style_comment_lookup_idx ON silver.${scope}_time(record_type,label);
CREATE INDEX ${scope}_time_date_idx ON silver.${scope}_time(time_date);
`;
const fixture=`
CREATE SCHEMA silver;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
${table('lo3rwang')}
${table('lrunes')}
INSERT INTO silver.lo3rwang_time(record_type,resource_id,label,time_date,anchor_ids,display_order,status,note,style_description)
VALUES
('anchor','birthday','初始錨點','2000-01-01',NULL,NULL,NULL,NULL,NULL),
('anchor','first-end','第一段結束','2001-01-01',NULL,NULL,NULL,NULL,NULL),
('anchor','second-start','第二段起點','2002-01-01',NULL,NULL,NULL,NULL,NULL),
('anchor','p7-start','最後真實錨點','2026-10-06',NULL,NULL,NULL,NULL,NULL),
('period','P1','時間痕跡一',NULL,ARRAY['birthday','first-end'],1,'released','原始說明',NULL),
('period','P6','時間痕跡六',NULL,ARRAY['second-start','p7-start'],6,'released','P6 保留',NULL),
('event','TRIPLE','歷史三錨點',NULL,ARRAY['birthday','first-end','second-start'],NULL,NULL,NULL,NULL),
('event','SINGLE','單點事件',NULL,ARRAY['p7-start'],NULL,NULL,NULL,NULL),
('style_comment','STYLE','原風格',NULL,ARRAY['birthday'],NULL,'active',NULL,'已備份風格');
INSERT INTO silver.lrunes_time(record_type,resource_id,label,time_date,anchor_ids,display_order,status)
VALUES
('anchor','start','符文起點','2024-01-01',NULL,NULL,NULL),
('anchor','finish','符文終點','2025-01-01',NULL,NULL,NULL),
('event','PAIR','符文事件',NULL,ARRAY['start','finish'],NULL,NULL),
('period','OPEN','舊虛擬至今',NULL,ARRAY['finish','0'],1,'current');
`;
try{
  psql({sql:fixture});
  psql({filename:migration});
  psql({sql:`
DO $$
DECLARE scope_name text; tbl text; originals bigint; migrated bigint;
BEGIN
 FOR scope_name IN SELECT unnest(ARRAY['lo3rwang','lrunes']) LOOP
   tbl:=format('silver.%I',scope_name||'_time');
   EXECUTE format('SELECT count(*) FROM %s',tbl) INTO migrated;
   SELECT count(*) INTO originals FROM silver.time_uid_cutover_backup WHERE scope_id=scope_name;
   IF originals<>(CASE WHEN scope_name='lo3rwang' THEN 9 ELSE 4 END) THEN
     RAISE EXCEPTION 'Backup count wrong for %: %',scope_name,originals; END IF;
   IF migrated<>(CASE WHEN scope_name='lo3rwang' THEN 11 ELSE 5 END) THEN
     RAISE EXCEPTION 'Migrated row count wrong for %: %',scope_name,migrated; END IF;
   EXECUTE format('SELECT count(*) FROM %s WHERE length(uid)<>4 OR type NOT IN (''anchor'',''time_period'',''time_trace'') OR (type<>''anchor'' AND address IS NOT NULL)',tbl)
     INTO migrated;
   IF migrated<>0 THEN RAISE EXCEPTION 'Invalid UID/type/date for %',scope_name; END IF;
   EXECUTE format($q$SELECT count(*) FROM %s t WHERE
      t.type='time_period' AND (cardinality(t.anchor_ids) NOT BETWEEN 1 AND 2 OR
      EXISTS (SELECT 1 FROM unnest(t.anchor_ids) AS a(uid) WHERE NOT EXISTS(
        SELECT 1 FROM %s anch WHERE anch.uid=a.uid AND anch.type='anchor')))
      OR t.type='time_trace' AND EXISTS (
       SELECT 1 FROM unnest(t.anchor_ids) AS e(uid) WHERE NOT EXISTS(
        SELECT 1 FROM %s evt WHERE evt.uid=e.uid AND evt.type='time_period'))
    $q$,tbl,tbl,tbl) INTO migrated;
   IF migrated<>0 THEN RAISE EXCEPTION 'Bad anchor/event references for %',scope_name; END IF;
 END LOOP;
 IF (SELECT cardinality(anchor_ids) FROM silver.lrunes_time
       WHERE title='舊虛擬至今')<>1 THEN
   RAISE EXCEPTION 'Virtual now was not removed'; END IF;
 IF (SELECT count(*) FROM silver.lo3rwang_time WHERE status='legacy_split')<>1 THEN
   RAISE EXCEPTION 'Historical three-anchor event not fully split'; END IF;
 IF NOT EXISTS (SELECT 1 FROM silver.lo3rwang_time WHERE title='時間痕跡六' AND type='time_trace')
 THEN RAISE EXCEPTION 'Original P6 trace missing'; END IF;
 IF has_table_privilege('anon','silver.time_uid_cutover_backup','SELECT')
   OR has_table_privilege('authenticated','silver.time_uid_cutover_backup','SELECT')
 THEN RAISE EXCEPTION 'Backup readable by public roles'; END IF;
END $$;
-- No ON DELETE CASCADE: broken endpoint only means a broken connection.
DELETE FROM silver.lo3rwang_time
WHERE type='anchor' AND title='第一段結束';
DO $$
BEGIN
 IF (SELECT count(*) FROM silver.lo3rwang_time WHERE type='time_trace')<>2
 OR (SELECT count(*) FROM silver.lo3rwang_time WHERE type='time_period')<>5
 THEN RAISE EXCEPTION 'Deleting anchor unexpectedly deleted events/traces'; END IF;
END $$;
`});
  console.log('Ephemeral PostgreSQL Time migration: backup, 4-digit UIDs, anchor/event/trace links, 0 removal, split event, public privileges and non-cascading deletion PASS');
}catch(error){
  console.error('Time cutover PostgreSQL smoke FAILED:',String(error?.stderr||error?.message||error).slice(0,5500));
  process.exitCode=1;
}
