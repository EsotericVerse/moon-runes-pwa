'use client';

import {selectNeonRows,insertNeonRows,updateNeonRows,deleteNeonRows,callNeonRpc} from './neon-repository';
import {buildScopeTreeIndex,validateScopeTreeMove} from '../modular-v2/modules/scope-tree/scope-tree-contract';

export const SCOPE_GOVERNANCE_TABLE='silver.loc_scope';
const recordFilter=record_type=>({column:'record_type',operator:'eq',value:record_type});
const scopeFilter=scope_id=>({column:'scope_id',operator:'eq',value:scope_id});
function safe(value){const id=String(value||'').trim();if(!/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/.test(id))throw new Error('無效的 Scope ID');return id;}
function limit(value,fallback,max){const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(max,Math.floor(n))):fallback;}

export async function selectScopes({limit:maximum=1000}={}){
  return (await selectNeonRows(SCOPE_GOVERNANCE_TABLE,{columns:'*',filters:[recordFilter('scope'),{column:'scope_id',operator:'neq',value:'admin'}],orders:[{column:'display_order',ascending:true}],limit:limit(maximum,1000,5000)})).rows;
}
export async function createScope(values){
  const scope_id=safe(values.scope_id);
  const rows=await insertNeonRows(SCOPE_GOVERNANCE_TABLE,[{...values,scope_id,record_type:'scope'}]);
  return rows[0];
}
export async function updateScope(scopeId,values){
  const {record_id,record_type,scope_id,legacy_scope_id,...patch}=values;
  const rows=await updateNeonRows(SCOPE_GOVERNANCE_TABLE,patch,{filters:[recordFilter('scope'),scopeFilter(safe(scopeId))]});
  if(!rows.length)throw new Error('Scope 不存在或沒有 admin 權限');
  return rows[0];
}
export async function deleteScope(scopeId){
  const rows=await deleteNeonRows(SCOPE_GOVERNANCE_TABLE,{filters:[recordFilter('scope'),scopeFilter(safe(scopeId))]});
  if(!rows.length)throw new Error('Scope 不存在或仍被其他資料使用');
  return rows[0];
}
export async function selectScopeRelations({scopeId=null,limit:maximum=1000}={}){
  const common={columns:'record_id,parent_scope_id,child_scope_id,relation_type,created_by,created_at',orders:[{column:'created_at',ascending:true}],limit:limit(maximum,1000,5000)};
  if(!scopeId)return (await selectNeonRows(SCOPE_GOVERNANCE_TABLE,{...common,filters:[recordFilter('relation')]})).rows.map(row=>({...row,id:row.record_id}));
  const id=safe(scopeId);
  const [parents,children]=await Promise.all(['parent_scope_id','child_scope_id'].map(column=>selectNeonRows(SCOPE_GOVERNANCE_TABLE,{...common,filters:[recordFilter('relation'),{column,operator:'eq',value:id}]})));
  return [...new Map([...parents.rows,...children.rows].map(row=>[row.record_id,{...row,id:row.record_id}])).values()];
}
export async function selectScopeRelationRequests({status=null,limit:maximum=200}={}){
  const {rows}=await selectNeonRows(SCOPE_GOVERNANCE_TABLE,{columns:'record_id,parent_scope_id,child_scope_id,relation_type,status,reason,review_note,requested_by,reviewed_by,created_at,reviewed_at',filters:[recordFilter('relation_request'),...(status?[{column:'status',operator:'eq',value:status}]:[])],orders:[{column:'created_at',ascending:false}],limit:limit(maximum,200,1000)});
  return rows.map(row=>({...row,id:row.record_id}));
}
export async function selectScopePermissions({scopeId=null,limit:maximum=500}={}){
  return (await selectNeonRows(SCOPE_GOVERNANCE_TABLE,{columns:'record_id,user_id,scope_id,access_level,case_id,created_at,granted_by,granted_at',filters:[recordFilter('access_grant'),...(scopeId?[scopeFilter(safe(scopeId))]:[])],orders:[{column:'created_at',ascending:false}],limit:limit(maximum,500,1000)})).rows;
}
export async function upsertScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  return callNeonRpc('grant_scope_access',{p_user_id:String(userId||'').trim(),p_scope_id:safe(scopeId),p_access_level:String(accessLevel||'').trim(),p_case_id:String(caseId||'').trim()||null});
}
export async function revokeScopeAccessGrant({userId,scopeId,accessLevel,caseId}){
  return callNeonRpc('revoke_scope_access',{p_user_id:String(userId||'').trim(),p_scope_id:safe(scopeId),p_access_level:String(accessLevel||'').trim(),p_case_id:String(caseId||'').trim()||null});
}
export async function requestScopeRelation(input,{rows=[]}={}){
  const validation=validateScopeTreeMove(rows,input);
  if(!validation.ok){const error=new Error(`Scope relation rejected: ${validation.reason}`);error.code=validation.reason;throw error;}
  return callNeonRpc('request_scope_relation',{p_parent_scope_id:safe(input.parent||input.parent_id),p_child_scope_id:safe(input.child||input.child_id||input.scope_id),p_relation_type:String(input.relation_type||'parent_child'),p_reason:input.reason||null});
}
export async function decideScopeRelationRequest(requestId,status,reviewNote=''){
  if(!['approved','rejected','revoked'].includes(status))throw new Error('Invalid Scope relation decision');
  return callNeonRpc('decide_scope_relation_request',{p_request_id:String(requestId||''),p_status:status,p_review_note:reviewNote||null,p_reviewed_by:null});
}
export function scopeRelationsToNodes(rows=[]){
  const nodes=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const parent=String(row.parent_scope_id||row.parent_id||'').trim();const child=String(row.child_scope_id||row.child_id||'').trim();
    for(const id of [parent,child])if(id&&!nodes.has(id))nodes.set(id,{id,label:id});
    if(child&&parent){const node=nodes.get(child);if(!node.parent_id)node.parent_id=parent;}
  }
  return [...nodes.values()];
}
export function scopeRowsToTree(rows=[]){
  const {nodes,children}=buildScopeTreeIndex(scopeRelationsToNodes(rows));const roots=[];
  for(const [id,node] of nodes){if(!node.parent_id&&!node.parent_scope_id)roots.push(node);node.children=(children.get(id)||[]).map(childId=>nodes.get(childId)).filter(Boolean);}
  return roots;
}
