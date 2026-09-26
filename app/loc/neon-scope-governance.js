'use client';

import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from './neon-repository';

export const MANAGE_TABLE='silver.manage';
const ID_PATTERN=/^[A-Za-z][A-Za-z0-9_.-]{0,62}$/;
const PRIVILEGE_PATTERN=/^(admin|scope:[A-Za-z][A-Za-z0-9_.-]{0,62}|page:[A-Za-z][A-Za-z0-9_.-]{0,62}:(culture|statics|media))$/;

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
function safePrivileges(value){
  const rows=[...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
  if(rows.some(item=>!PRIVILEGE_PATTERN.test(item)))throw new Error('privileges 格式無效');
  return rows;
}
function limit(value,fallback,max){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(1,Math.min(max,Math.floor(n))):fallback;
}
function idOf(row){
  return row?.record_type==='group'?String(row.group_id||''):String(row.scope_id||'');
}

export async function selectManagedNodes({limit:maximum=1000}={}){
  return (await selectNeonRows(MANAGE_TABLE,{
    columns:'record_id,record_type,group_id,scope_id,parent_group_id,active,display_order,created_at,updated_at',
    filters:[{column:'record_type',operator:'in',value:['group','scope']}],
    orders:[{column:'display_order',ascending:true}],
    limit:limit(maximum,1000,5000)
  })).rows;
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
    display_order:Number.isFinite(Number(values.display_order))?Number(values.display_order):null
  };
  if(type==='scope'&&!payload.parent_group_id)throw new Error('Scope 必須掛在 Group 之下');
  const rows=await insertNeonRows(MANAGE_TABLE,[payload]);
  return rows[0];
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
  const rows=await updateNeonRows(MANAGE_TABLE,patch,{filters:[
    {column:'record_type',operator:'eq',value:type},
    {column:idColumn,operator:'eq',value:nodeId}
  ]});
  if(!rows.length)throw new Error('管理節點不存在');
  return rows[0];
}

export async function deleteManagedNode(row){
  const type=safeType(row?.record_type);
  const nodeId=safeId(idOf(row),type==='group'?'Group ID':'Scope ID');
  if(type==='group'){
    const {rows:children}=await selectNeonRows(MANAGE_TABLE,{
      columns:'record_id',
      filters:[
        {column:'record_type',operator:'in',value:['group','scope']},
        {column:'parent_group_id',operator:'eq',value:nodeId}
      ],
      limit:1
    });
    if(children.length)throw new Error('此 Group 仍有下層節點，請先移動下層節點');
  }
  const idColumn=type==='group'?'group_id':'scope_id';
  const rows=await deleteNeonRows(MANAGE_TABLE,{filters:[
    {column:'record_type',operator:'eq',value:type},
    {column:idColumn,operator:'eq',value:nodeId}
  ]});
  return rows[0]||null;
}

export async function selectPermissions({limit:maximum=500}={}){
  return (await selectNeonRows(MANAGE_TABLE,{
    columns:'record_id,user_id,email,privileges,created_at,updated_at',
    filters:[{column:'record_type',operator:'eq',value:'permission'}],
    orders:[{column:'updated_at',ascending:false}],
    limit:limit(maximum,500,1000)
  })).rows;
}

export async function upsertPermission({userId,email,privileges}){
  const user_id=String(userId||'').trim();
  const cleanEmail=String(email||'').trim();
  if(!user_id)throw new Error('user_id 不可空白');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))throw new Error('email 格式無效');
  const cleanPrivileges=safePrivileges(privileges);
  const {rows}=await selectNeonRows(MANAGE_TABLE,{
    columns:'record_id',
    filters:[
      {column:'record_type',operator:'eq',value:'permission'},
      {column:'user_id',operator:'eq',value:user_id}
    ],
    limit:1
  });
  if(rows.length){
    const updated=await updateNeonRows(MANAGE_TABLE,{email:cleanEmail,privileges:cleanPrivileges,updated_at:new Date().toISOString()},{filters:[
      {column:'record_type',operator:'eq',value:'permission'},
      {column:'user_id',operator:'eq',value:user_id}
    ]});
    return updated[0];
  }
  const inserted=await insertNeonRows(MANAGE_TABLE,[{
    record_type:'permission',user_id,email:cleanEmail,privileges:cleanPrivileges
  }]);
  return inserted[0];
}

export async function deletePermission(userId){
  const user_id=String(userId||'').trim();
  if(!user_id)throw new Error('user_id 不可空白');
  return (await deleteNeonRows(MANAGE_TABLE,{filters:[
    {column:'record_type',operator:'eq',value:'permission'},
    {column:'user_id',operator:'eq',value:user_id}
  ]}))[0]||null;
}

export function managedNodeId(row){return idOf(row)}
