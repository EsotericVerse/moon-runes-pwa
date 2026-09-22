'use client';

import {selectNeonRows,insertNeonRows,upsertNeonRows,deleteNeonRows,callNeonRpc} from './neon-repository';
import {buildScopeTreeIndex,validateScopeTreeMove} from '../modular-v2/modules/scope-tree/scope-tree-contract';

export const SCOPE_GOVERNANCE_TABLES=Object.freeze({
  relations:'api.scope_relations',
  requests:'api.scope_relation_requests',
  permissions:'api.scope_access_grants'
});

function cleanLimit(value,fallback,max){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(1,Math.min(max,Math.floor(n))):fallback;
}

export async function selectScopeRelations({scopeId=null,limit=1000}={}){
  const safeLimit=cleanLimit(limit,1000,5000);
  const common={columns:'*',orders:[{column:'created_at',ascending:true}],limit:safeLimit};
  if(!scopeId)return (await selectNeonRows(SCOPE_GOVERNANCE_TABLES.relations,common)).rows;
  const id=safe(scopeId);
  const [parents,children]=await Promise.all([
    selectNeonRows(SCOPE_GOVERNANCE_TABLES.relations,{...common,filters:[{column:'parent_scope_id',operator:'eq',value:id}]}),
    selectNeonRows(SCOPE_GOVERNANCE_TABLES.relations,{...common,filters:[{column:'child_scope_id',operator:'eq',value:id}]})
  ]);
  const unique=new Map([...parents.rows,...children.rows].map(row=>[row.id,row]));
  return [...unique.values()].slice(0,safeLimit);
}

export async function selectScopeRelationRequests({status=null,limit=200}={}){
  const result=await selectNeonRows(SCOPE_GOVERNANCE_TABLES.requests,{
    columns:'*',orders:[{column:'created_at',ascending:false}],limit:cleanLimit(limit,200,1000),
    filters:status?[{column:'status',operator:'eq',value:status}]:[]
  });
  return result.rows;
}

export async function selectScopePermissions({scopeId=null,limit=500}={}){
  const result=await selectNeonRows(SCOPE_GOVERNANCE_TABLES.permissions,{
    columns:'*',orders:[{column:'created_at',ascending:false}],limit:cleanLimit(limit,500,1000),
    filters:scopeId?[{column:'scope_id',operator:'eq',value:safe(scopeId)}]:[]
  });
  return result.rows;
}

export async function upsertScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  const payload={user_id:String(userId||'').trim(),scope_id:safe(scopeId),access_level:String(accessLevel||'').trim(),case_id:String(caseId||'').trim()};
  if(!payload.user_id||!payload.access_level||!payload.case_id)throw new Error('Scope access grant requires user, Scope, level and case');
  const rows=await upsertNeonRows(SCOPE_GOVERNANCE_TABLES.permissions,[payload]);
  return rows[0]||payload;
}

export async function revokeScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  return deleteNeonRows(SCOPE_GOVERNANCE_TABLES.permissions,{filters:[
    {column:'user_id',operator:'eq',value:String(userId||'').trim()},
    {column:'scope_id',operator:'eq',value:safe(scopeId)},
    {column:'access_level',operator:'eq',value:String(accessLevel||'').trim()},
    {column:'case_id',operator:'eq',value:String(caseId||'').trim()}
  ]});
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
    parent_scope_id:safe(input.parent||input.parent_id),
    child_scope_id:safe(input.child||input.child_id||input.scope_id),
    relation_type:String(input.relation_type||'parent_child'),
    status:'pending',
    reason:input.reason||null,
    requested_by:requestedBy?String(requestedBy).trim():null
  };
  const result=await insertNeonRows(SCOPE_GOVERNANCE_TABLES.requests,[payload]);
  return result[0]||payload;
}

export async function decideScopeRelationRequest(requestId,status,reviewNote='',reviewedBy=null){
  if(!['approved','rejected','revoked'].includes(status))throw new Error('Invalid Scope relation decision');
  return callNeonRpc('decide_scope_relation_request',{
    p_request_id:String(requestId||''),
    p_status:status,
    p_review_note:reviewNote||null,
    p_reviewed_by:reviewedBy?String(reviewedBy).trim():null
  });
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
