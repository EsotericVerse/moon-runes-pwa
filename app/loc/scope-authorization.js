import {z} from 'zod';

const PrivilegeSchema=z.string().trim().min(1).regex(/^[A-Za-z][A-Za-z0-9_.-]*$/,'Invalid privilege');

const PermissionRowSchema=z.object({
  user_id:z.string().trim().min(1).optional(),
  email:z.string().trim().email(),
  privileges:z.array(PrivilegeSchema).min(1)
}).passthrough();

const PAGE_PERMISSION_GROUP=Object.freeze({
  context:'statics',search:'statics',statics:'statics',
  period:'culture',event:'culture',anchor:'culture',culture:'culture',
  media:'media'
});
const permissionGroup=value=>PAGE_PERMISSION_GROUP[String(value||'').trim()]||String(value||'').trim();
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
      return hasAdmin()||Boolean(scope&&privileges.includes(scope));
    },
    canManagePage:async(scopeId,pageId)=>{
      const scope=normalizeScopeId(scopeId);
      const page=permissionGroup(pageId);
      if(!scope||!page)return false;
      return hasAdmin()||privileges.includes(scope)||privileges.includes(`${scope}_${page}`);
    }
  });
}
