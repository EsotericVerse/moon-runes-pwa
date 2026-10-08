-- Read-only parity audit for every managed Scope Time table.
-- A result row is schema drift: missing/extra column, changed type, nullability
-- or default. Empty result means all managed Time tables match lo3rwang_time.
WITH canonical AS (
  SELECT column_name,data_type,udt_name,is_nullable,coalesce(column_default,'') AS col_default
  FROM information_schema.columns
  WHERE table_schema='silver' AND table_name='lo3rwang_time'
), managed AS (
  SELECT DISTINCT m.id, m.id||'_'||coalesce(nullif(m.time,''),'time') AS table_name
  FROM silver.manage m
  WHERE m.role IN ('admin','scope')
), actual AS (
  SELECT table_name,column_name,data_type,udt_name,is_nullable,coalesce(column_default,'') AS col_default
  FROM information_schema.columns
  WHERE table_schema='silver'
)
SELECT m.id AS scope_id,m.table_name,c.column_name,'missing_or_mismatch' AS issue,
       c.data_type AS expected_type,a.data_type AS actual_type,
       c.udt_name AS expected_udt,a.udt_name AS actual_udt
FROM managed m CROSS JOIN canonical c
LEFT JOIN actual a ON a.table_name=m.table_name AND a.column_name=c.column_name
WHERE a.column_name IS NULL OR
      (a.data_type,a.udt_name,a.is_nullable,a.col_default) IS DISTINCT FROM
      (c.data_type,c.udt_name,c.is_nullable,c.col_default)
UNION ALL
SELECT m.id,m.table_name,a.column_name,'unexpected_column',
       NULL,a.data_type,NULL,a.udt_name
FROM managed m JOIN actual a ON a.table_name=m.table_name
LEFT JOIN canonical c ON c.column_name=a.column_name
WHERE c.column_name IS NULL
ORDER BY scope_id,table_name,column_name;
