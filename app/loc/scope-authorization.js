import {newEnforcer,newModelFromString} from 'casbin';
import {z} from 'zod';

const GrantSchema=z.object({
  record_type:z.enum(['admin','access_grant']),
  scope_id:z.string().trim().min(1).nullable().optional(),
  access_level:z.enum(['scope_manager','culture_manager','statics_manager','media_manager']).nullable().optional(),
  case_id:z.string().nullable().optional()
});

const PAGE_PERMISSION_GROUP=Object.freeze({
  search:'statics',statics:'statics',context:'statics',
  period:'culture',event:'culture',anchor:'culture',culture:'culture',
  media:'media',
  governance:'scope',style:'scope'
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

export function validateScopeGrants(value){
  return z.array(GrantSchema).parse(Array.isArray(value)?value:[]);
}

export function isAdminGrant(grant){
  return grant?.record_type==='admin';
}
export function isScopeManagerGrant(grant,scopeId){
  return grant?.record_type==='access_grant'&&grant.access_level==='scope_manager'&&grant.scope_id===scopeId;
}
export function isDomainManagerGrant(grant,scopeId,domain){
  return grant?.record_type==='access_grant'&&grant.access_level===domain+'_manager'&&grant.scope_id===scopeId;
}

export async function createScopeAuthorizer(userId,rawGrants){
  const subject=String(userId||'').trim();
  if(!subject)return Object.freeze({
    grants:Object.freeze([]),
    canManageGlobal:async()=>false,
    canManageScope:async()=>false,
    canManagePage:async()=>false
  });
  const grants=validateScopeGrants(rawGrants);
  const enforcer=await newEnforcer(newModelFromString(MODEL));

  for(const grant of grants){
    if(grant.record_type==='admin'){
      await enforcer.addPolicy(subject,'*','*','manage');
      continue;
    }
    if(!grant.scope_id)continue;
    if(grant.access_level==='scope_manager'){
      await enforcer.addPolicy(subject,grant.scope_id,'*','manage');
      continue;
    }
    const domain=grant.access_level?.replace(/_manager$/,'');
    if(domain)await enforcer.addPolicy(subject,grant.scope_id,`case:${domain}`,'manage');
  }

  return Object.freeze({
    grants:Object.freeze(grants),
    canManageGlobal:()=>enforcer.enforce(subject,'*','*','manage'),
    canManageScope:(scopeId)=>enforcer.enforce(subject,String(scopeId||''),'*','manage'),
    canManagePage:(scopeId,pageId)=>enforcer.enforce(subject,String(scopeId||''),`case:${permissionGroup(pageId)}`,'manage')
  });
}
