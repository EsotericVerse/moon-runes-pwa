"""Build a reviewable standard PostgreSQL schema from exported current catalogs.

No database connection or writes. Never infer columns from historical SQL files.
"""
import json
import sys
from pathlib import Path

inventory = json.loads(Path(sys.argv[1]).read_text())
boundary = json.loads(Path(sys.argv[2]).read_text())
output = Path(sys.argv[3])
retired_columns = {'reply_to', 'in_reply_to_username', 'reference_only'}
tables = {(r['schema_name'], r['relname']) for r in inventory['relations']
          if r['relkind'] == 'r' and r['relname'] != 'faq_entries'}

def ident(value):
    return '"' + value.replace('"', '""') + '"'

def relation(schema, table):
    return ident(schema) + '.' + ident(table)

def identity(expression):
    return expression.replace('auth.user_id()', 'api.current_user_id()').replace('auth.jwt()', 'api.request_claims()')

sql = ['-- Generated from the current PostgreSQL catalog; application data is not included.',
       '-- Restore existing RLS only; silver/api remain private Data API schemas.',
       'CREATE SCHEMA silver;', 'CREATE SCHEMA api;',
       "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anonymous') THEN CREATE ROLE anonymous NOLOGIN; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;",
       'REVOKE ALL ON SCHEMA silver,api FROM PUBLIC;',
       "CREATE FUNCTION api.request_claims() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;",
       "CREATE FUNCTION api.current_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(api.request_claims()->>'sub','') $$;"]

for schema, table in sorted(tables):
    parts = []
    for column in sorted((c for c in inventory['columns'] if c['schema_name'] == schema and c['relname'] == table), key=lambda c: c['attnum']):
        if table.endswith('_galaxy') and column['attname'] in retired_columns:
            continue
        value = ident(column['attname']) + ' ' + column['type']
        if column['attidentity']:
            value += ' GENERATED ' + ('ALWAYS' if column['attidentity'] == 'a' else 'BY DEFAULT') + ' AS IDENTITY'
        elif column['attgenerated']:
            value += ' GENERATED ALWAYS AS (' + column['default_expression'] + ') STORED'
        elif column['default_expression'] is not None:
            value += ' DEFAULT ' + identity(column['default_expression'])
        if column['attnotnull']:
            value += ' NOT NULL'
        parts.append(value)
    if table.endswith('_galaxy') and not any(c['attname'] == 'statistics_able' for c in inventory['columns'] if c['schema_name'] == schema and c['relname'] == table):
        parts.append('statistics_able boolean NOT NULL DEFAULT true')
    for constraint in inventory['constraints']:
        if (constraint['schema_name'], constraint['relname']) == (schema, table) and constraint['contype'] not in ('n', 'f'):
            parts.append('CONSTRAINT ' + ident(constraint['conname']) + ' ' + constraint['definition'])
    sql.append('CREATE TABLE ' + relation(schema, table) + ' (\n  ' + ',\n  '.join(parts) + '\n);')

for constraint in inventory['constraints']:
    if (constraint['schema_name'], constraint['relname']) in tables and constraint['contype'] == 'f':
        sql.append('ALTER TABLE ' + relation(constraint['schema_name'], constraint['relname']) + ' ADD CONSTRAINT ' + ident(constraint['conname']) + ' ' + constraint['definition'] + ';')
constraint_indexes = {c['conname'] for c in inventory['constraints'] if c['contype'] in ('p', 'u', 'x')}
for index in inventory['indexes']:
    if (index['schemaname'], index['tablename']) in tables and index['indexname'] not in constraint_indexes:
        sql.append(index['indexdef'] + ';')

function_order = [
    ('silver', 'current_auth_email'),
    ('silver', 'can_manage_global'),
    ('silver', 'can_manage_scope'),
    ('api', 'management_write'),
    ('silver', 'normalize_galaxy_content_validity'),
]
for schema_name, name in function_order:
    function = next(f for f in inventory['functions'] if f['schema_name'] == schema_name and f['proname'] == name)
    definition = identity(function['definition']).replace("'silver', 'auth', 'public'", "'pg_catalog', 'silver', 'api'")
    sql.append(definition + ';')

sql.extend([
    "CREATE OR REPLACE FUNCTION silver.management_write(p_table text,p_operation text,p_rows jsonb DEFAULT NULL::jsonb,p_values jsonb DEFAULT NULL::jsonb,p_filters jsonb DEFAULT '[]'::jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.management_write(p_table,p_operation,p_rows,p_values,p_filters) $;",
    "CREATE OR REPLACE FUNCTION silver.apply_keyword_classification(p_scope_id text,p_rows jsonb) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.apply_keyword_classification(p_scope_id,p_rows) $;",
    "CREATE OR REPLACE FUNCTION silver.read_keyword_class(p_scope_id text,p_class_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.read_keyword_class(p_scope_id,p_class_id) $;",
    "CREATE OR REPLACE FUNCTION silver.provision_scope(p_scope_id text,p_display_name text,p_email text,p_birthday date DEFAULT NULL::date,p_domain text DEFAULT NULL::text,p_directory text DEFAULT NULL::text,p_parent_scope_id text DEFAULT 'loc'::text,p_theme text DEFAULT 'theme-7'::text,p_copy_keywords boolean DEFAULT true) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.provision_scope(p_scope_id,p_display_name,p_email,p_birthday,p_domain,p_directory,p_parent_scope_id,p_theme,p_copy_keywords) $;",
    "CREATE OR REPLACE FUNCTION silver.manage_scope_registry(p_operation text,p_scope_id text,p_values jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.manage_scope_registry(p_operation,p_scope_id,p_values) $;",
    "CREATE OR REPLACE FUNCTION silver.log_search_keyword(p_scope_id text,p_query_text text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $ SELECT api.log_search_keyword(p_scope_id,p_query_text) $;",
])
for view in inventory['views']:
    options = ','.join(view['reloptions'] or [])
    sql.append('CREATE VIEW ' + relation(view['schema_name'], view['relname']) + (' WITH (' + options + ')' if options else '') + ' AS ' + view['definition'])
for trigger in inventory['triggers']:
    if (trigger['schema_name'], trigger['relname']) in tables:
        sql.append(trigger['definition'] + ';')
for row in inventory['relations']:
    if (row['schema_name'], row['relname']) in tables and row['relrowsecurity']:
        sql.append('ALTER TABLE ' + relation(row['schema_name'], row['relname']) + ' ENABLE ROW LEVEL SECURITY;')
        if row['relforcerowsecurity']:
            sql.append('ALTER TABLE ' + relation(row['schema_name'], row['relname']) + ' FORCE ROW LEVEL SECURITY;')
for policy in boundary['policies']:
    roles = ','.join(ident(r) for r in policy['roles'])
    value = 'CREATE POLICY ' + ident(policy['policyname']) + ' ON ' + relation(policy['schemaname'], policy['tablename']) + ' AS ' + policy['permissive'] + ' FOR ' + policy['cmd'] + ' TO ' + roles
    if policy['qual'] is not None:
        value += ' USING (' + identity(policy['qual']) + ')'
    if policy['with_check'] is not None:
        value += ' WITH CHECK (' + identity(policy['with_check']) + ')'
    sql.append(value + ';')
sql.extend(['GRANT USAGE ON SCHEMA silver,api TO anonymous,authenticated;',
            'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA silver,api FROM PUBLIC;',
            'GRANT EXECUTE ON FUNCTION api.request_claims(),api.current_user_id(),silver.current_auth_email(),silver.can_manage_global(),silver.can_manage_scope(text) TO authenticated;',
            'GRANT EXECUTE ON FUNCTION api.management_write(text,text,jsonb,jsonb,jsonb) TO authenticated;',
            'GRANT EXECUTE ON FUNCTION silver.management_write(text,text,jsonb,jsonb,jsonb),silver.apply_keyword_classification(text,jsonb),silver.provision_scope(text,text,text,date,text,text,text,text,boolean),silver.manage_scope_registry(text,text,jsonb) TO authenticated;',
            'GRANT EXECUTE ON FUNCTION silver.read_keyword_class(text,uuid),silver.log_search_keyword(text,text) TO anonymous,authenticated;'])
for grant in inventory['table_grants']:
    if grant['grantee'] in ('anonymous', 'authenticated') and (grant['table_schema'], grant['table_name']) in tables.union({('api', 'lo3rwang_keywords_manage')}):
        sql.append('GRANT ' + grant['privilege_type'] + ' ON ' + relation(grant['table_schema'], grant['table_name']) + ' TO ' + ident(grant['grantee']) + ';')
sql.append('GRANT SELECT (id,role,birthday,galaxy,time) ON silver.manage TO anonymous;')
sql.append('GRANT USAGE,SELECT ON SEQUENCE silver.lo3rwang_keywords_keyword_id_seq TO authenticated;')
output.write_text('\n\n'.join(sql) + '\n')
print(json.dumps({'tables': len(tables), 'policies': len(boundary['policies']), 'sql_bytes': output.stat().st_size}))
