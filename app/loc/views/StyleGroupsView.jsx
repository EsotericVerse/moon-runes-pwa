'use client';

import { useMemo, useState } from 'react';
import { useLocalStore, removeById, updateById } from '../local-store';
import { downloadJsonFile, readJsonFile } from '../local-db';

const STORAGE_KEY='loc-style-groups-v1';
const MAX_GROUPS=8;
const MAX_KEYWORDS=64;
const MAX_NOR=8;
const TEMPLATE_GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序'];

const makeGroup=(index,name=`群組 ${index+1}`)=>({
  id:`group-${index+1}`,
  name,
  description:'',
  keywords:[],
  nor:[],
  is_fallback:false
});

const INITIAL_STATE={
  version:1,
  groups:TEMPLATE_GROUPS.map((name,index)=>makeGroup(index,name)),
  fallback:{id:'special',name:'特殊',description:'未命中其他群組的內容會進入這裡。',keywords:[],nor:[],is_fallback:true}
};

const parseTerms=(value,max)=>[...new Set(String(value||'').split(/[\n、,，]/).map(x=>x.trim()).filter(Boolean))].slice(0,max);
const termsText=value=>(value||[]).join('\n');

function validateImport(data){
  if(!data||typeof data!=='object')throw new Error('JSON 格式錯誤');
  const groups=(Array.isArray(data.groups)?data.groups:[]).slice(0,MAX_GROUPS).map((group,index)=>({
    id:String(group.id||`group-${index+1}`),
    name:String(group.name||`群組 ${index+1}`),
    description:String(group.description||''),
    keywords:parseTerms((group.keywords||[]).join('\n'),MAX_KEYWORDS),
    nor:parseTerms((group.nor||[]).join('\n'),MAX_NOR),
    is_fallback:false
  }));
  return {
    version:1,
    groups,
    fallback:{
      id:'special',
      name:String(data.fallback?.name||'特殊'),
      description:String(data.fallback?.description||'未命中其他群組的內容會進入這裡。'),
      keywords:[],nor:[],is_fallback:true
    }
  };
}

export default function StyleGroupsView(){
  const {value:data,setValue:setData,reset,isPersistent}=useLocalStore(STORAGE_KEY,INITIAL_STATE);
  const [message,setMessage]=useState('');
  const groups=data?.groups||[];
  const fallback=data?.fallback||INITIAL_STATE.fallback;
  const stats=useMemo(()=>({
    groups:groups.length,
    keywords:groups.reduce((sum,g)=>sum+(g.keywords?.length||0),0),
    nor:groups.reduce((sum,g)=>sum+(g.nor?.length||0),0)
  }),[groups]);

  const updateGroup=(id,patch)=>setData(current=>({...current,groups:updateById(current.groups,id,patch)}));
  const updateFallback=patch=>setData(current=>({...current,fallback:{...current.fallback,...patch,id:'special',is_fallback:true}}));
  const deleteGroup=id=>setData(current=>({...current,groups:removeById(current.groups,id)}));
  const addGroup=()=>{
    if(groups.length>=MAX_GROUPS)return;
    const used=new Set(groups.map(x=>x.id));let n=1;while(used.has(`group-${n}`))n+=1;
    setData(current=>({...current,groups:[...current.groups,{...makeGroup(n-1),id:`group-${n}`}]}));
  };
  const useTemplate=()=>{
    setData(current=>({...current,groups:TEMPLATE_GROUPS.map((name,index)=>({...makeGroup(index,name),description:`月之符文符號型語言模板：${name}組`}))}));
    setMessage('已套用月之符文八組模板。');
  };
  const importFile=async event=>{
    try{setData(validateImport(await readJsonFile(event.target.files?.[0])));setMessage('已從本機檔案匯入設定。');}
    catch(error){setMessage(`匯入失敗：${error.message}`);}
    event.target.value='';
  };

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Local Style Groups</p><h1>群組設定</h1><p>8 個可自訂群組 + 第 9 預設承接組。設定只存在本機；每組最多 64 個關鍵詞、8 個 NOR，採 exact match。</p></header>
    <section className="loc-card">
      <div className="loc-actions">
        <button className="loc-button primary" onClick={addGroup} disabled={groups.length>=MAX_GROUPS}>＋新增群組</button>
        <button className="loc-button" onClick={useTemplate}>套用月之符文模板</button>
        <button className="loc-button" onClick={()=>downloadJsonFile(data,'loc-style-groups.json')}>匯出 JSON</button>
        <label className="loc-button">匯入 JSON<input className="loc-hidden-input" type="file" accept="application/json,.json" onChange={importFile}/></label>
        <button className="loc-button" onClick={()=>{reset();setMessage('已重設本機設定。')}}>重設</button>
      </div>
      <div className="loc-metrics"><div><small>群組</small><strong>{stats.groups}/{MAX_GROUPS}</strong></div><div><small>關鍵詞</small><strong>{stats.keywords}</strong></div><div><small>NOR</small><strong>{stats.nor}</strong></div></div>
      <p className="loc-status">{isPersistent?'本機持久化中':'目前瀏覽器無法持久化，設定只保留於本次工作階段。'}</p>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <div className="loc-context-list">
      {groups.map((group,index)=><article className="loc-card loc-style-group" key={group.id}>
        <div className="loc-result-meta"><span>群組 {index+1}</span><button className="loc-button" onClick={()=>deleteGroup(group.id)}>刪除</button></div>
        <div className="loc-record-form">
          <label>名稱<input value={group.name} onChange={e=>updateGroup(group.id,{name:e.target.value})}/></label>
          <label>說明<input value={group.description} onChange={e=>updateGroup(group.id,{description:e.target.value})}/></label>
          <label className="wide">關鍵詞 · {group.keywords?.length||0}/{MAX_KEYWORDS}<textarea rows="6" value={termsText(group.keywords)} onChange={e=>updateGroup(group.id,{keywords:parseTerms(e.target.value,MAX_KEYWORDS)})}/></label>
          <label className="wide">NOR · {group.nor?.length||0}/{MAX_NOR}<textarea rows="3" value={termsText(group.nor)} onChange={e=>updateGroup(group.id,{nor:parseTerms(e.target.value,MAX_NOR)})}/></label>
        </div>
      </article>)}
      <article className="loc-card loc-style-group fallback">
        <div className="loc-result-meta"><span>第 9 組 · 預設承接</span><span>不可刪除</span></div>
        <div className="loc-record-form">
          <label>名稱<input value={fallback.name} onChange={e=>updateFallback({name:e.target.value})}/></label>
          <label>說明<input value={fallback.description} onChange={e=>updateFallback({description:e.target.value})}/></label>
        </div>
      </article>
    </div>
  </section>;
}
