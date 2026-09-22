import {newEnforcer,newModelFromString} from 'casbin';
import {z} from 'zod';

const ScopeGrantSchema=z.object({
  scope_id:z.string().trim().min(1),
  access_level:z.enum(['global_admin','scope_manager','page_manager','privacy_dispute_handler']),
  case_id:z.string().trim().min(1)
});

const MODEL=`[request_definition]
r = sub, scope, obj, act
[policy_definition]
p = sub, scope, obj, act
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = r.sub == p.sub && (p.scope == "*" || r.scope == p.scope) && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)`;

export function validateScopeGrants(value){
  return z.array(ScopeGrantSchema).parse(Array.isArray(value)?value:[]);
}

export async function createScopeAuthorizer(userId,rawGrants){
  const subject=String(userId||'').trim();
  if(!subject)return Object.freeze({grants:Object.freeze([]),canManageGlobal:async()=>false,canManageScope:async()=>false,canManagePage:async()=>false});
  const grants=validateScopeGrants(rawGrants);
  const enforcer=await newEnforcer(newModelFromString(MODEL));
  for(const grant of grants){
    if(grant.access_level==='global_admin'){
      await enforcer.addPolicy(subject,'*','*','*');
    }else if(grant.access_level==='scope_manager'){
      await enforcer.addPolicy(subject,grant.scope_id,'*','manage');
    }else if(grant.access_level==='page_manager'){
      await enforcer.addPolicy(subject,grant.scope_id,`case:${grant.case_id}`,'manage');
    }
  }
  return Object.freeze({
    grants:Object.freeze(grants),
    canManageGlobal:()=>enforcer.enforce(subject,'admin','*','manage'),
    canManageScope:(scopeId)=>enforcer.enforce(subject,String(scopeId||''),'*','manage'),
    canManagePage:(scopeId,pageId)=>enforcer.enforce(subject,String(scopeId||''),`case:${String(pageId||'')}`,'manage')
  });
}
