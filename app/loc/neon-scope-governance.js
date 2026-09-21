'use client';

import {neonClient} from './neon-client';
import {buildScopeTreeIndex,validateScopeTreeMove} from '../modular-v2/modules/scope-tree/scope-tree-contract';

export const SCOPE_GOVERNANCE_TABLES=Object.freeze({
  relations:'scope_relations',
  requests:'scope_relation_requests',
  permissions:'scope_access_grants'
});

function failure(error,fallback){
  if(!error)return null;
  return new Error(`${fallback}: ${error.message||'query failed'}`);
}

export async function selectScopeRelations({scopeId=null,limit=1000}={}){
  let query=neonClient.from(SCOPE_GOVERNANCE_TABLES.relations).select('*').order('created_at',{ascending:true}).limit(limit);
  if(scopeId)query=query.or(`parent_scope_id.eq.${safe(scopeId)},child_scope_id.eq.${safe(scopeId)}`);
  const {data,error}=await query;
  if(error)throw failure(error,'Scope relation read failed');
  return Array.isArray(data)?data:[];
}

export async function selectScopeRelationRequests({status=null,limit=200}={}){
  let query=neonClient.from(SCOPE_GOVERNANCE_TABLES.requests).select('*').order('created_at',{ascending:false}).limit(limit);
  if(status)query=query.eq('status',status);
  const {data,error}=await query;
  if(error)throw failure(error,'Scope relation request read failed');
  return Array.isArray(data)?data:[];
}

export async function selectScopePermissions({scopeId=null,limit=500}={}){
  let query=neonClient.from(SCOPE_GOVERNANCE_TABLES.permissions).select('*').order('created_at',{ascending:false}).limit(limit);
  if(scopeId)query=query.eq('scope_id',scopeId);
  const {data,error}=await query;
  if(error)throw failure(error,'Scope permission read failed');
  return Array.isArray(data)?data:[];
}

export async function upsertScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  const payload={user_id:String(userId||'').trim(),scope_id:String(scopeId||'').trim(),access_level:String(accessLevel||'').trim(),case_id:String(caseId||'').trim()};
  if(Object.values(payload).some(value=>!value))throw new Error('Scope access grant requires user, Scope, level and case');
  const {data,error}=await neonClient.from(SCOPE_GOVERNANCE_TABLES.permissions).upsert(payload).select('*').limit(1);
  if(error)throw failure(error,'Scope access grant write failed');
  return data?.[0]||payload;
}

export async function revokeScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  const {data,error}=await neonClient.from(SCOPE_GOVERNANCE_TABLES.permissions).delete()
    .eq('user_id',userId).eq('scope_id',scopeId).eq('access_level',accessLevel).eq('case_id',caseId).select('*');
  if(error)throw failure(error,'Scope access grant revoke failed');
  return Array.isArray(data)?data:[];
}

export async function requestScopeRelation(input,{rows=[],requestedBy=null}={}){
  const validation=validateScopeTreeMove(rows,input);
  if(!validation.ok){
    const error=new Error(`Scope relation rejected: ${validation.reason}`);
    error.code=validation.reason;
    error.depths=validation.depths;
    throw error;
  }
  const payload={
    parent_scope_id:String(input.parent||input.parent_id).trim(),
    child_scope_id:String(input.child||input.child_id||input.scope_id).trim(),
    relation_type:String(input.relation_type||'parent_child'),
    status:'pending',
    reason:input.reason||null,
    requested_by:requestedBy?String(requestedBy).trim():null
  };
  const {data,error}=await neonClient.from(SCOPE_GOVERNANCE_TABLES.requests).insert(payload).select('*').limit(1);
  if(error)throw failure(error,'Scope relation request failed');
  return data?.[0]||payload;
}

export async function decideScopeRelationRequest(requestId,status,reviewNote='',reviewedBy=null){
  if(!['approved','rejected','revoked'].includes(status))throw new Error('Invalid Scope relation decision');
  const {data,error}=await neonClient.rpc('decide_scope_relation_request',{
    p_request_id:requestId,
    p_status:status,
    p_review_note:reviewNote||null,
    p_reviewed_by:reviewedBy?String(reviewedBy).trim():null
  });
  if(error)throw failure(error,'Scope relation decision failed');
  return Array.isArray(data)?data[0]||null:data||null;
}

export function scopeRelationsToNodes(rows=[]){
  const nodes=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const parent=String(row.parent_scope_id||row.parent_id||'').trim();
    const child=String(row.child_scope_id||row.child_id||'').trim();
    for(const id of [parent,child])if(id&&!nodes.has(id))nodes.set(id,{id,label:id});
    if(child&&parent){
      const node=nodes.get(child);if(!node.parent_id)node.parent_id=parent;
    }
  }
  return [...nodes.values()];
}

export function scopeRowsToTree(rows=[]){
  const {nodes,children}=buildScopeTreeIndex(scopeRelationsToNodes(rows));
  const roots=[];
  for(const [id,node] of nodes){
    if(!node.parent_id&&!node.parent_scope_id)roots.push(node);
    node.children=(children.get(id)||[]).map(childId=>nodes.get(childId)).filter(Boolean);
  }
  return roots;
}

function safe(value){
  const result=String(value||'').trim();
  if(!/^[A-Za-z0-9_.-]+$/.test(result))throw new Error('Invalid Scope id');
  return result;
}
