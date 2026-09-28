'use client';

import {neonAuthClient,neonPublicClient} from './neon-client';

export const MANAGE_TABLE='silver.manage';

function manageRelation(client){return client.schema('silver').from('manage');}

const ID_PATTERN=/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/;

function safeId(value,label='ID'){
  const id=String(value||'').trim();
  if(!ID_PATTERN.test(id))throw new Error(`無效的 ${label}`);
  return id;
}
function safeType(value){
  const type=String(value||'').trim();
  if(!['group','scope'].includes(type))throw new Error('節點類型只能是 group 或 scope');
  return type;
}
function limit(value,fallback,max){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(1,Math.min(max,Math.floor(n))):fallback;
}
function idOf(row){
  return row?.record_type==='group'?String(row.group_id||''):String(row.scope_id||'');
}

export async function selectManagedNodes(){
  const {data,error}=await manageRelation(neonPublicClient)
    .select('record_id,record_type,group_id,scope_id,parent_group_id,active,display_order,created_at,updated_at')
    .in('record_type',['group','scope'])
    .order('display_order',{ascending:true});
  if(error)throw new Error(error.message||'管理資料讀取失敗');
  return data||[];
}

export async function createManagedNode(values){
  const type=safeType(values.record_type);
  const nodeId=safeId(values.node_id,type==='group'?'Group ID':'Scope ID');
  const parent=String(values.parent_group_id||'').trim();
  const payload={
    record_type:type,
    group_id:type==='group'?nodeId:null,
    scope_id:type==='scope'?nodeId:null,
    parent_group_id:parent?safeId(parent,'上層 Group ID'):null,
    active:values.active!==false,
    default_theme_id:'theme-7',
    display_order:Number.isFinite(Number(values.display_order))?Number(values.display_order):null
  };
  if(type==='scope'&&!payload.parent_group_id)throw new Error('Scope 必須掛在 Group 之下');
  const {data,error}=await manageRelation(neonAuthClient).insert([payload]).select('*');
  if(error)throw new Error(error.message||'管理節點新增失敗');
  return data?.[0];
}

export async function updateManagedNode(row,values){
  const type=safeType(row?.record_type);
  const nodeId=safeId(idOf(row),type==='group'?'Group ID':'Scope ID');
  const parent=String(values.parent_group_id||'').trim();
  if(type==='scope'&&!parent)throw new Error('Scope 必須掛在 Group 之下');
  if(type==='group'&&parent===nodeId)throw new Error('Group 不能掛在自己底下');
  const patch={
    parent_group_id:parent?safeId(parent,'上層 Group ID'):null,
    active:values.active!==false,
    display_order:Number.isFinite(Number(values.display_order))?Number(values.display_order):null,
    updated_at:new Date().toISOString()
  };
  const idColumn=type==='group'?'group_id':'scope_id';
  let query=manageRelation(neonAuthClient).update(patch).eq('record_type',type).eq(idColumn,nodeId);
  const {data,error}=await query.select('*');
  if(error)throw new Error(error.message||'管理節點更新失敗');
  if(!data?.length)throw new Error('管理節點不存在');
  return data[0];
}

export async function deleteManagedNode(row){
  const type=safeType(row?.record_type);
  const nodeId=safeId(idOf(row),type==='group'?'Group ID':'Scope ID');
  if(type==='group'){
    const {data:children,error}=await manageRelation(neonPublicClient)
      .select('record_id')
      .in('record_type',['group','scope'])
      .eq('parent_group_id',nodeId)
      .limit(1);
    if(error)throw new Error(error.message||'管理節點讀取失敗');
    if(children?.length)throw new Error('此 Group 仍有下層節點，請先移動下層節點');
  }
  const idColumn=type==='group'?'group_id':'scope_id';
  const {data,error}=await manageRelation(neonAuthClient)
    .delete()
    .eq('record_type',type)
    .eq(idColumn,nodeId)
    .select('*');
  if(error)throw new Error(error.message||'管理節點刪除失敗');
  return data?.[0]||null;
}

export function managedNodeId(row){return idOf(row)}
