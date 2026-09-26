import {z} from 'zod';

const PrivilegeSchema=z.string().trim().min(1).regex(/^(admin|scope:[A-Za-z][A-Za-z0-9_.-]{0,62})$/,'Invalid privilege');

const PermissionRowSchema=z.object({
  user_id:z.string().trim().min(1).optional(),
  email:z.string().trim().email(),
  privileges:z.array(PrivilegeSchema).min(1)
}).passthrough();

const normalizeScopeId=value=>String(value||'').trim();

function normalizePrivileges(rawRows){
  const rows=Array.isArray(rawRows)?rawRows:[];
  const privileges=[];
  for(const raw of rows){
    const parsed=PermissionRowSchema.safeParse(raw);
    if(parsed.success)privileges.push(...parsed.data.privileges);
  }
  return [...new Set(privileges.map(value=>PrivilegeSchema.parse(value)))];
}

export function validateScopeGrants(value){
  return normalizePrivileges(value);
}

export async function createScopeAuthorizer(rawRows){
  const rows=Array.isArray(rawRows)?rawRows:[];
  const privileges=normalizePrivileges(rows);
  const hasAdmin=()=>privileges.includes('admin');

  return Object.freeze({
    grants:Object.freeze(rows),
    privileges:Object.freeze(privileges),
    canManageGlobal:async()=>hasAdmin(),
    canManageScope:async scopeId=>{
      const scope=normalizeScopeId(scopeId);
      return hasAdmin()||Boolean(scope&&privileges.includes(`scope:${scope}`));
    }
  });
}
