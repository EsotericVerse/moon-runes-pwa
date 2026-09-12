'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';
import { googleDriveConfigured, loadJsonFromGoogleDrive, saveJsonToGoogleDrive } from '../google-drive';
import { downloadJsonFile, readJsonFile } from '../local-db';
import { useLocalStore, removeById, updateById } from '../local-store';
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

const DRIVE_FILE='loc-style-groups.json';

export default function StyleGroupsView(){
  const {value:data,setValue:setData,reset,isPersistent}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const [message,setMessage]=useState('');
  const [suggestions,setSuggestions]=useState([]);
  const [testText,setTestText]=useState('');
  const groups=data?.groups||[];
  const fallback=data?.fallback||INITIAL_STYLE_PROFILE.fallback;
  const driveReady=googleDriveConfigured();

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
    try{setData(normalizeStyleProfile(await readJsonFile(event.target.files?.[0])));setMessage('已從本機檔案匯入設定。');}
    catch(error){setMessage(`匯入失敗：${error.message}`);}
    event.target.value='';
  };
  const saveDrive=async()=>{
    try{await saveJsonToGoogleDrive(DRIVE_FILE,data);setMessage('已存到自己的 Google Drive appDataFolder。');}
    catch(error){setMessage(`Google Drive 儲存失敗：${error.message}`);}
  };
  const loadDrive=async()=>{
    try{setData(normalizeStyleProfile(await loadJsonFromGoogleDrive(DRIVE_FILE)));setMessage('已從自己的 Google Drive 讀回群組設定。');}
    catch(error){setMessage(`Google Drive 讀取失敗：${error.message}`);}
  };

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Local Style Groups</p><h1>群組設定</h1><p>8 個可自訂群組 + 第 9 預設承接組。設定以本機為主；每組最多 64 個關鍵詞、8 個 NOR，採 exact match。月之符文只提供可刪改的符號型語言模板。</p></header>
    <section className="loc-card">
      <div className="loc-actions">
        <button className="loc-button primary" onClick={addGroup} disabled={groups.length>=MAX_STYLE_GROUPS}>＋新增群組</button>
        <button className="loc-button" onClick={useTemplate}>套用月之符文模板</button>
        <button className="loc-button" onClick={()=>downloadJsonFile(data,DRIVE_FILE)}>匯出 JSON</button>
        <label className="loc-button">匯入 JSON<input className="loc-hidden-input" type="file" accept="application/json,.json" onChange={importFile}/></label>
        <button className="loc-button" onClick={saveDrive} disabled={!driveReady}>存到 Google Drive</button>
        <button className="loc-button" onClick={loadDrive} disabled={!driveReady}>從 Google Drive 讀取</button>
        <button className="loc-button" onClick={()=>{reset();setMessage('已重設本機設定。')}}>重設</button>
      </div>
      <div className="loc-metrics"><div><small>群組</small><strong>{stats.groups}/{MAX_STYLE_GROUPS}</strong></div><div><small>關鍵詞</small><strong>{stats.keywords}</strong></div><div><small>NOR</small><strong>{stats.nor}</strong></div></div>
      <p className="loc-status">{isPersistent?'本機持久化中':'目前瀏覽器無法持久化，設定只保留於本次工作階段。'}{driveReady?' Google Drive 僅在手動存／讀時使用 OAuth。':' Google Drive OAuth 尚未設定 client ID。'}</p>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Exact-match test</p>
      <h2>本機分類測試</h2>
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
