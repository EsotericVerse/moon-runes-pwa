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

-- Approval is exposed as one RPC so validation, parent replacement, edge creation,
-- and request status transition share one database transaction.
create or replace function api.decide_scope_relation_request(
  p_request_id uuid,
  p_status text,
  p_review_note text default null,
  p_reviewed_by text default null
)
returns api.scope_relation_requests
language plpgsql
set search_path = api, public
as $function$
declare
  v_request api.scope_relation_requests;
  v_parent_depth integer := 0;
  v_child_depth integer := 0;
begin
  if p_status not in ('approved','rejected','revoked') then
    raise exception 'invalid Scope relation decision: %', p_status using errcode = 'check_violation';
  end if;

  select * into v_request from api.scope_relation_requests where id = p_request_id for update;
  if not found then
    raise exception 'Scope relation request not found: %', p_request_id using errcode = 'no_data_found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Scope relation request is not pending: %', v_request.status using errcode = 'check_violation';
  end if;

  if p_status = 'approved' then
    perform pg_advisory_xact_lock(hashtextextended('scope-governance-relation-approval', 0));
    perform 1 from api.scope_relations
     where child_scope_id = v_request.child_scope_id
        or parent_scope_id = v_request.parent_scope_id
     for update;

    if exists (
      with recursive parent_chain(scope_id, path) as (
        select r.parent_scope_id, array[r.parent_scope_id]
          from api.scope_relations r
         where r.child_scope_id = v_request.parent_scope_id
           and r.child_scope_id <> v_request.child_scope_id
        union all
        select r.parent_scope_id, pc.path || r.parent_scope_id
          from api.scope_relations r join parent_chain pc on pc.scope_id = r.child_scope_id
         where r.child_scope_id <> v_request.child_scope_id
           and not r.parent_scope_id = any(pc.path)
      )
      select 1 from parent_chain where scope_id = v_request.child_scope_id
    ) then
      raise exception 'Scope relation would create a cycle' using errcode = 'check_violation';
    end if;

    with recursive parent_chain(scope_id, depth, path) as (
      select r.parent_scope_id, 1, array[r.parent_scope_id]
        from api.scope_relations r
       where r.child_scope_id = v_request.parent_scope_id
         and r.child_scope_id <> v_request.child_scope_id
      union all
      select r.parent_scope_id, pc.depth + 1, pc.path || r.parent_scope_id
        from api.scope_relations r join parent_chain pc on pc.scope_id = r.child_scope_id
       where r.child_scope_id <> v_request.child_scope_id
         and not r.parent_scope_id = any(pc.path)
    )
    select 1 + coalesce(max(depth), 0) into v_parent_depth from parent_chain;

    with recursive child_chain(scope_id, depth, path) as (
      select r.child_scope_id, 1, array[r.child_scope_id]
        from api.scope_relations r where r.parent_scope_id = v_request.child_scope_id
      union all
      select r.child_scope_id, cc.depth + 1, cc.path || r.child_scope_id
        from api.scope_relations r join child_chain cc on cc.scope_id = r.parent_scope_id
       where not r.child_scope_id = any(cc.path)
    )
    select coalesce(max(depth), 0) into v_child_depth from child_chain;

    if v_parent_depth > 4 then
      raise exception 'Scope parent depth limit exceeded: %', v_parent_depth using errcode = 'check_violation';
    end if;
    if v_child_depth > 4 then
      raise exception 'Scope child depth limit exceeded: %', v_child_depth using errcode = 'check_violation';
    end if;
    if v_parent_depth + 1 + v_child_depth > 8 then
      raise exception 'Scope total depth limit exceeded: %', v_parent_depth + 1 + v_child_depth using errcode = 'check_violation';
    end if;

    delete from api.scope_relations where child_scope_id = v_request.child_scope_id;
    insert into api.scope_relations(parent_scope_id,child_scope_id,relation_type,created_by)
    values (
      v_request.parent_scope_id,
      v_request.child_scope_id,
      coalesce(v_request.relation_type,'parent_child'),
      nullif(trim(coalesce(p_reviewed_by,v_request.reviewed_by)), '')
    )
    on conflict (parent_scope_id,child_scope_id) do update set
      relation_type = excluded.relation_type,
      created_by = excluded.created_by;
  end if;

  update api.scope_relation_requests
     set status = p_status,
         review_note = nullif(trim(p_review_note), ''),
         reviewed_by = nullif(trim(p_reviewed_by), ''),
         reviewed_at = now()
   where id = v_request.id
   returning * into v_request;
  return v_request;
end;
$function$;
