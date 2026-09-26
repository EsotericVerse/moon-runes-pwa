import {newEnforcer,newModelFromString} from 'casbin';
import {z} from 'zod';

const ScopeIdSchema=z.string().trim().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/);
const PageSchema=z.enum(['culture','statics','media']);
const PrivilegeSchema=z.string().trim().refine(value=>{
  if(value==='admin'||value==='blacklist')return true;
  if(value.startsWith('scope:'))return ScopeIdSchema.safeParse(value.slice(6)).success;
  if(value.startsWith('page:')){
    const [,scopeId,pageId]=value.split(':');
    return ScopeIdSchema.safeParse(scopeId).success&&PageSchema.safeParse(pageId).success;
  }
  return false;
},'Invalid privilege');

const PermissionRowSchema=z.object({
  user_id:z.string().trim().min(1),
  email:z.string().trim().email(),
  privileges:z.array(PrivilegeSchema).min(1)
}).passthrough();

const PAGE_PERMISSION_GROUP=Object.freeze({
  context:'statics',search:'statics',statics:'statics',
  period:'culture',event:'culture',anchor:'culture',culture:'culture',
  media:'media'
});
const permissionGroup=value=>PAGE_PERMISSION_GROUP[String(value||'').trim()]||String(value||'').trim();

const MODEL=`[request_definition]
r = sub, scope, obj, act
[policy_definition]
p = sub, scope, obj, act
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = r.sub == p.sub && (p.scope == "*" || r.scope == p.scope) && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)`;

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

export async function createScopeAuthorizer(userId,rawRows){
  const subject=String(userId||'').trim();
  if(!subject)return Object.freeze({
    grants:Object.freeze([]),privileges:Object.freeze([]),
    canManageGlobal:async()=>false,canManageScope:async()=>false,canManagePage:async()=>false
  });
  const privileges=normalizePrivileges(rawRows);
  const blacklisted=privileges.includes('blacklist');
  const enforcer=await newEnforcer(newModelFromString(MODEL));
  if(!blacklisted){
    for(const privilege of privileges){
      if(privilege==='admin'){
        await enforcer.addPolicy(subject,'*','*','manage');
        continue;
      }
      if(privilege.startsWith('scope:')){
        await enforcer.addPolicy(subject,privilege.slice(6),'*','manage');
        continue;
      }
      if(privilege.startsWith('page:')){
        const [,scopeId,pageId]=privilege.split(':');
        await enforcer.addPolicy(subject,scopeId,`case:${pageId}`,'manage');
      }
    }
  }
  return Object.freeze({
    grants:Object.freeze(rawRows||[]),
    privileges:Object.freeze(privileges),
    blacklisted,
    canManageGlobal:()=>blacklisted?false:enforcer.enforce(subject,'*','*','manage'),
    canManageScope:(scopeId)=>blacklisted?false:enforcer.enforce(subject,String(scopeId||''),'*','manage'),
    canManagePage:(scopeId,pageId)=>blacklisted?false:enforcer.enforce(subject,String(scopeId||''),`case:${permissionGroup(pageId)}`,'manage')
  });
}
