-- Personal IP Extra Sign: one-time Registry assignment, public read-only presentation.
-- The owner email is derived from the canonical lo3rwang admin mapping, never
-- hard-coded into browser code and never exposed with the Registry read.
alter table silver.scope_registry add column if not exists extra_sign text;

-- Each Sign key is unique to its registered Scope. NULL means no Extra Sign.
create unique index if not exists scope_registry_extra_sign_unique
  on silver.scope_registry(extra_sign) where extra_sign is not null;

create or replace function silver.registered_scope_extra_sign(
  p_scope_id text,
  p_scope_kind text
) returns text
language plpgsql stable security definer set search_path=''
as $function$
declare
  v_owner_email text;
begin
  select lower(btrim(email)) into v_owner_email
    from silver.manage
   where id='lo3rwang' and role='admin'
   order by email limit 1;
  if coalesce(v_owner_email,'')='' then return null; end if;

  -- LOC is the canonical root Group. It has no separate manage/email row;
  -- the personal owner identity is established by the Author admin mapping.
  if p_scope_id='loc' and p_scope_kind='group' then return 'codex'; end if;

  -- Author/LunaRunes must belong to that exact registered owner at creation.
  if p_scope_kind='scope' and p_scope_id in ('lo3rwang','lrunes') and exists(
    select 1 from silver.manage m
     where m.id=p_scope_id
       and lower(btrim(m.email))=v_owner_email
       and m.role in ('admin','scope')
  ) then
    return case p_scope_id
      when 'lo3rwang' then 'anchor'
      when 'lrunes' then 'moon'
      else null
    end;
  end if;
  return null;
end;
$function$;

-- No client-supplied key, impersonated Scope name or login-time check.
create or replace function silver.set_scope_extra_sign_on_insert()
returns trigger
language plpgsql security definer set search_path=''
as $function$
begin
  new.extra_sign := silver.registered_scope_extra_sign(new.scope_id,new.scope_kind);
  return new;
end;
$function$;

drop trigger if exists scope_registry_register_extra_sign on silver.scope_registry;
create trigger scope_registry_register_extra_sign
  before insert on silver.scope_registry
  for each row execute function silver.set_scope_extra_sign_on_insert();

-- Backfill the three existing canonical Registry nodes once.
-- Never mutate an already assigned Sign during ordinary page reads/edits.
update silver.scope_registry
   set extra_sign=silver.registered_scope_extra_sign(scope_id,scope_kind)
 where scope_id in ('loc','lo3rwang','lrunes')
   and extra_sign is null;

revoke all on function silver.registered_scope_extra_sign(text,text)
  from public, anonymous, authenticated;
revoke all on function silver.set_scope_extra_sign_on_insert()
  from public, anonymous, authenticated;

select pg_catalog.pg_notify('pgrst','reload schema');
