-- Move the known content relation metadata keys to typed columns.
alter table silver.content_relations
  add column basis text,
  add column literature_id text,
  add column record_role text,
  add column scope_id text,
  add column source_migrated boolean,
  add column target_model text,
  add column status text;
update silver.content_relations set
  basis=metadata->>'basis',
  literature_id=metadata->>'literature_id',
  record_role=metadata->>'record_role',
  scope_id=metadata->>'scope_id',
  source_migrated=nullif(metadata->>'source_migrated','')::boolean,
  target_model=metadata->>'target_model',
  status=metadata->>'status';
alter table silver.content_relations drop column metadata;
