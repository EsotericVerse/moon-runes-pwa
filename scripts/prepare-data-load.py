"""Prepare temporary INSERT/verification batches; no canonical data enters the repo."""
import json
import sys
from pathlib import Path

export_dir, inventory_file, boundary_file, output_dir = map(Path, sys.argv[1:5])
inventory = json.loads(inventory_file.read_text())
boundary = json.loads(boundary_file.read_text())
manifest_file = Path(sys.argv[5]) if len(sys.argv) > 5 else export_dir / 'manifest.json'
manifest = json.loads(manifest_file.read_text())
output_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
batches = []

def ident(value):
    return '"' + value.replace('"', '""') + '"'

def literal(value):
    return "'" + json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace("'", "''") + "'::jsonb"

def save_batch(table, columns, keys, rows):
    relation = '.'.join(ident(part) for part in table.split('.'))
    fields = ','.join(map(ident, columns))
    join = ' AND '.join('i.' + ident(key) + '=s.' + ident(key) for key in keys)
    query = 'WITH source AS (SELECT * FROM jsonb_populate_recordset(NULL::' + relation + ',' + literal(rows) + ')), inserted AS (INSERT INTO ' + relation + ' (' + fields + ') SELECT ' + fields + ' FROM source RETURNING *) SELECT count(*) AS inserted_count, count(*) FILTER (WHERE to_jsonb(i) IS DISTINCT FROM to_jsonb(s)) AS mismatches FROM inserted i JOIN source s ON ' + join + ';\n'
    filename = output_dir / ('batch-' + str(len(batches)).zfill(4) + '.sql')
    filename.write_text(query)
    filename.chmod(0o600)
    batches.append({'path': str(filename), 'table': table, 'rows': len(rows), 'utf16Length': len(query.encode('utf-16-le')) // 2})

def prepare(table, rows, columns):
    schema, name = table.split('.')
    if name.endswith('_galaxy'):
        columns = columns + ['statistics_able']
        for row in rows:
            row['statistics_able'] = row.get('content_type') != 'instruction'
            if not isinstance(row['statistics_able'], bool):
                raise ValueError('statistics_able must be a validated boolean for ' + table + ' uid=' + str(row.get('uid')))
    pk = next(c for c in inventory['constraints'] if c['schema_name'] == schema and c['relname'] == name and c['contype'] == 'p')
    keys = pk['definition'].split('(', 1)[1].split(')', 1)[0].split(',')
    keys = [key.strip().strip('"') for key in keys]
    batch = []
    size = 0
    for row in rows:
        row_size = len(json.dumps(row, ensure_ascii=False))
        if batch and (size + row_size > 180000 or len(batch) >= 500):
            save_batch(table, columns, keys, batch)
            batch, size = [], 0
        batch.append(row)
        size += row_size
    if batch:
        save_batch(table, columns, keys, batch)

for item in manifest:
    prepare(item['table'], json.loads((export_dir / (item['table'].split('.')[1] + '.json')).read_text()), item['columns'])
for name, schema in [('manage', 'silver'), ('user_records', 'api'), ('user_settings', 'api')]:
    rows = boundary[name]
    if rows:
        columns = [c['attname'] for c in sorted(inventory['columns'], key=lambda c: c['attnum']) if c['schema_name'] == schema and c['relname'] == name]
        prepare(schema + '.' + name, rows, columns)
(output_dir / 'batches.json').write_text(json.dumps(batches))
(output_dir / 'batches.json').chmod(0o600)
print(json.dumps({'batches': len(batches), 'rows': sum(b['rows'] for b in batches), 'largest_sql_characters': max((b['utf16Length'] for b in batches), default=0)}))
