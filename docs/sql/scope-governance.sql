-- Scope governance runtime contract. Apply in Neon before enabling writes.
-- The Data API exposes the api schema, matching the existing runtime views.
create table if not exists api.scope_relations (
  id uuid primary key default gen_random_uuid(),
  parent_scope_id text not null,
  child_scope_id text not null,
  relation_type text not null default 'parent_child',
  created_by uuid null,
  created_at timestamptz not null default now(),
  unique(parent_scope_id, child_scope_id),
  check(parent_scope_id <> child_scope_id)
);

create table if not exists api.scope_relation_requests (
  id uuid primary key default gen_random_uuid(),
  parent_scope_id text not null,
  child_scope_id text not null,
  relation_type text not null default 'parent_child',
  status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
  reason text null,
  review_note text null,
  requested_by text null,
  reviewed_by text null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  check(parent_scope_id <> child_scope_id)
);

create index if not exists scope_relations_parent_idx on api.scope_relations(parent_scope_id);
create index if not exists scope_relations_child_idx on api.scope_relations(child_scope_id);
create index if not exists scope_relation_requests_status_idx on api.scope_relation_requests(status,created_at desc);
