'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';
import { removeById, updateById } from '../local-store';
import { useNeonSetting } from '../use-neon-setting';
import { buildRuneSuggestionRegistry, classifyText } from '../model/style-classifier';
import {
  INITIAL_STYLE_PROFILE,
  MAX_STYLE_GROUPS,
  MAX_STYLE_KEYWORDS,
  MAX_STYLE_NOR,
  STYLE_STORAGE_KEY,
  TEMPLATE_STYLE_GROUPS,
  makeStyleGroup,
  normalizeStyleProfile,
  parseStyleTerms,
  styleTermsText
} from '../model/style-profile';
import { exportJson, readJsonFile } from '../file-utils';

const EXPORT_FILE='loc-style-groups.json';

export default function StyleGroupsView({embedded=false}){
  const {value:data,setValue:setData,reset,status:syncStatus,account}=useNeonSetting(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const [message,setMessage]=useState('');
  const [suggestions,setSuggestions]=useState([]);
  const [testText,setTestText]=useState('');
  const groups=data?.groups||[];
  const fallback=data?.fallback||INITIAL_STYLE_PROFILE.fallback;

  useEffect(()=>{
    let live=true;
    fetchLocJson(LOC_DATA.RUNES)
      .then(runes=>live&&setSuggestions(buildRuneSuggestionRegistry(runes)))
      .catch(()=>live&&setSuggestions([]));
    return()=>{live=false};
  },[]);

  const stats=useMemo(()=>({
    groups:groups.length,
    keywords:groups.reduce((sum,g)=>sum+(g.keywords?.length||0),0),
    nor:groups.reduce((sum,g)=>sum+(g.nor?.length||0),0)
  }),[groups]);
  const testResult=useMemo(()=>testText.trim()?classifyText(testText,data):null,[testText,data]);

  const updateGroup=(id,patch)=>setData(current=>({...current,groups:updateById(current.groups,id,patch)}));
  const updateFallback=patch=>setData(current=>({...current,fallback:{...current.fallback,...patch,id:'special',is_fallback:true}}));
  const deleteGroup=id=>setData(current=>({...current,groups:removeById(current.groups,id)}));
  const addGroup=()=>{
    if(groups.length>=MAX_STYLE_GROUPS)return;
    const used=new Set(groups.map(x=>x.id));let n=1;while(used.has(`group-${n}`))n+=1;
    setData(current=>({...current,groups:[...current.groups,{...makeStyleGroup(n-1),id:`group-${n}`}]}));
  };
  const useTemplate=()=>{
    const suggestionMap=new Map(suggestions.map(item=>[item.name,item]));
    setData(current=>({...current,groups:TEMPLATE_STYLE_GROUPS.map((name,index)=>{
      const source=suggestionMap.get(name)||{};
      return {...makeStyleGroup(index,name),description:`月之符文符號型語言模板：${name}組`,keywords:(source.keywords||[]).slice(0,MAX_STYLE_KEYWORDS),nor:(source.nor||[]).slice(0,MAX_STYLE_NOR)};
    })}));
    setMessage(suggestions.length?'已套用月之符文八組模板與 canonical 關鍵詞建議。':'已套用月之符文八組模板；關鍵詞建議尚未載入。');
  };
  const importFile=async event=>{
    try{setData(normalizeStyleProfile(await readJsonFile(event.target.files?.[0])));setMessage('已匯入並同步到 Neon。');}
    catch(error){setMessage(`匯入失敗：${error.message}`);}
    event.target.value='';
  };

  return <section className={embedded?'':'loc-view'}>
    {!embedded&&<header className="loc-hero"><p className="loc-eyebrow">Neon Style Groups</p><h1>群組設定</h1><p>8 個可自訂群組 + 第 9 預設承接組。登入後設定同步到 Neon；每組最多 64 個關鍵詞、8 個 NOR，採 exact match。</p></header>}
    {embedded&&<section className="loc-card"><p className="loc-eyebrow">Groups · 群組</p><h2>群組設定</h2><p>8 個可自訂群組 + 第 9 預設承接組。群組屬於個人設定的一部分；每組最多 64 個關鍵詞、8 個 NOR，採 exact match。</p></section>}
    <section className="loc-card">
      <div className="loc-actions">
        {!account.user&&<button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>}
        <button className="loc-button primary" onClick={addGroup} disabled={groups.length>=MAX_STYLE_GROUPS}>＋新增群組</button>
        <button className="loc-button" onClick={useTemplate}>套用月之符文模板</button>
        <button className="loc-button" onClick={()=>exportJson(data,EXPORT_FILE)}>匯出 JSON</button>
        <label className="loc-button">匯入 JSON<input className="loc-hidden-input" type="file" accept="application/json,.json" onChange={importFile}/></label>
        <button className="loc-button" onClick={()=>{reset();setMessage('已重設 Neon 設定。')}} disabled={!account.user}>重設</button>
      </div>
      <div className="loc-metrics"><div><small>群組</small><strong>{stats.groups}/{MAX_STYLE_GROUPS}</strong></div><div><small>關鍵詞</small><strong>{stats.keywords}</strong></div><div><small>NOR</small><strong>{stats.nor}</strong></div></div>
      <p className="loc-status">{account.loading?'正在確認 Neon 帳號…':account.user?`Neon 已登入：${account.user.email||account.user.name||'使用者'}`:'尚未登入；目前修改只停留在本次畫面，登入後才會同步。'} {syncStatus}</p>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Exact-match test</p>
      <h2>即時分類測試</h2>
      <textarea className="loc-textarea" rows="4" value={testText} onChange={e=>setTestText(e.target.value)} placeholder="輸入一段文字，立即用目前群組設定比對。"/>
      {testResult&&<div className="loc-chip-list">{testResult.matches.map(item=><span key={item.id}>{item.name}{item.hits.length?` · ${item.hits.join('、')}`:' · fallback'}</span>)}</div>}
    </section>

    <div className="loc-context-list">
      {groups.map((group,index)=><article className="loc-card loc-style-group" key={group.id}>
        <div className="loc-result-meta"><span>群組 {index+1}</span><button className="loc-button" onClick={()=>deleteGroup(group.id)}>刪除</button></div>
        <div className="loc-record-form">
          <label>名稱<input value={group.name} onChange={e=>updateGroup(group.id,{name:e.target.value})}/></label>
          <label>說明<input value={group.description} onChange={e=>updateGroup(group.id,{description:e.target.value})}/></label>
          <label className="wide">關鍵詞 · {group.keywords?.length||0}/{MAX_STYLE_KEYWORDS}<textarea rows="6" value={styleTermsText(group.keywords)} onChange={e=>updateGroup(group.id,{keywords:parseStyleTerms(e.target.value,MAX_STYLE_KEYWORDS)})}/></label>
          <label className="wide">NOR · {group.nor?.length||0}/{MAX_STYLE_NOR}<textarea rows="3" value={styleTermsText(group.nor)} onChange={e=>updateGroup(group.id,{nor:parseStyleTerms(e.target.value,MAX_STYLE_NOR)})}/></label>
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