'use client';

import {neonAuthClient,neonPublicClient} from './neon-client';

function storageScopeId(scopeId){
  const id=String(scopeId||'').trim();
  return id==='lunarunes'?'lrunes':id;
}
function relation(client){
  return client.schema('silver').from('content_blocks');
}

export async function selectContentBlocks(scopeId,pageKey){
  const scope=storageScopeId(scopeId);
  const page=String(pageKey||'').trim();
  if(!scope||!page)return [];
  const {data,error}=await relation(neonPublicClient)
    .select('block_id,scope_id,page_key,slot_key,eyebrow,title,body,display_order,active,updated_at')
    .eq('scope_id',scope)
    .eq('page_key',page)
    .eq('active',true)
    .order('display_order',{ascending:true})
    .order('created_at',{ascending:true});
  if(error)throw new Error(error.message||'文字方塊讀取失敗');
  return data||[];
}

export async function upsertContentBlock(scopeId,pageKey,slotKey,values={}){
  const scope=storageScopeId(scopeId);
  const page=String(pageKey||'').trim();
  const slot=String(slotKey||'').trim();
  if(!scope||!page||!slot)throw new Error('文字方塊識別不完整');
  const row={
    scope_id:scope,
    page_key:page,
    slot_key:slot,
    eyebrow:String(values.eyebrow||'').trim()||null,
    title:String(values.title||'').trim()||null,
    body:String(values.body||''),
    display_order:Number.isFinite(Number(values.display_order))?Number(values.display_order):0,
    active:values.active!==false,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await relation(neonAuthClient)
    .upsert([row],{onConflict:'scope_id,page_key,slot_key'})
    .select('block_id,scope_id,page_key,slot_key,eyebrow,title,body,display_order,active,updated_at');
  if(error)throw new Error(error.message||'文字方塊儲存失敗');
  return data?.[0]||null;
}

export async function deleteContentBlock(scopeId,pageKey,slotKey){
  const scope=storageScopeId(scopeId);
  const page=String(pageKey||'').trim();
  const slot=String(slotKey||'').trim();
  const {data,error}=await relation(neonAuthClient)
    .delete()
    .eq('scope_id',scope)
    .eq('page_key',page)
    .eq('slot_key',slot)
    .select('block_id');
  if(error)throw new Error(error.message||'文字方塊刪除失敗');
  return data?.[0]||null;
}

export async function reorderContentBlocks(scopeId,pageKey,orderedSlotKeys=[]){
  const scope=storageScopeId(scopeId);
  const page=String(pageKey||'').trim();
  for(let index=0;index<orderedSlotKeys.length;index+=1){
    const slot=String(orderedSlotKeys[index]||'').trim();
    if(!slot)continue;
    const {error}=await relation(neonAuthClient)
      .update({display_order:index+1,updated_at:new Date().toISOString()})
      .eq('scope_id',scope)
      .eq('page_key',page)
      .eq('slot_key',slot);
    if(error)throw new Error(error.message||'文字方塊排序失敗');
  }
}

export function contentBlockStorageScopeId(scopeId){
  return storageScopeId(scopeId);
}
