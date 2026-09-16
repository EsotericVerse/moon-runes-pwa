'use client';

import { useMemo, useState } from 'react';
import { localRecordStorage } from '../storage';
import { useLocalStore } from '../local-store';
import { classifyText } from '../model/style-classifier';
import { classifyRuneSemantics } from '../model/rune-semantic-classifier';
import { createLibraryRecord, INITIAL_STYLE_PROFILE, STYLE_STORAGE_KEY } from '../model/style-profile';

export default function ClassifyView(){
  const {value:profile}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const [title,setTitle]=useState('');
  const [text,setText]=useState('');
  const [source,setSource]=useState('manual');
  const [authorScope,setAuthorScope]=useState(false);
  const [message,setMessage]=useState('');
  const result=useMemo(()=>text.trim()?classifyText(text,profile):null,[text,profile]);
  const runeResult=useMemo(()=>text.trim()?classifyRuneSemantics(text,{authorScope}):null,[text,authorScope]);

  async function save(){
    if(!text.trim())return;
    const classification={...result,lunarunes:runeResult};
    const record=createLibraryRecord({title,text,source,classification});
    await localRecordStorage.put(record);
    setMessage(`已存入資料庫：${record.title}`);
  }

  async function loadTextFile(event){
    const file=event.target.files?.[0];
    if(!file)return;
    try{setTitle(file.name.replace(/\.[^.]+$/,''));setSource(`file:${file.name}`);setText(await file.text());setMessage(`已載入 ${file.name}，尚未存入資料庫。`);}catch(error){setMessage(`讀取失敗：${error.message}`);}
    event.target.value='';
  }

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Local Classifier · No API</p><h1>分類</h1><p className="loc-subtitle">LOC 群組分類與 LunaRunes 參照語意演算法在本機並行；符文結果顯示實際採用的判別原則與理由。</p></header>
    <section className="loc-card"><div className="loc-record-form"><label>標題<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：今天的筆記"/></label><label>來源<input value={source} onChange={e=>setSource(e.target.value)} placeholder="manual / notes / file"/></label><label>作者治理 <input type="checkbox" checked={authorScope} onChange={e=>setAuthorScope(e.target.checked)}/> Lucas Oscar Wang 政德 Author Scope</label><label className="wide">文字<textarea rows="10" value={text} onChange={e=>setText(e.target.value)} placeholder="貼上要分類的文字。"/></label></div><div className="loc-actions"><label className="loc-button">載入 TXT／MD<input className="loc-hidden-input" type="file" accept="text/plain,text/markdown,.txt,.md" onChange={loadTextFile}/></label><button className="loc-button primary" onClick={save} disabled={!text.trim()}>分類後存入資料庫</button><button className="loc-button" onClick={()=>{setTitle('');setText('');setSource('manual');setMessage('')}}>清除</button></div>{message&&<p className="loc-status">{message}</p>}</section>
    <section className="loc-card"><p className="loc-eyebrow">LunaRunes Semantic Judgment</p><h2>符文演算法結果</h2><p className="loc-subtitle">關鍵字只建立候選；完整詞義依 AND／PLUS／OVERRIDE／DEFER 判定。允許多符並存，不計算數字權重。</p>{!runeResult?<p className="loc-status">輸入文字後會立即顯示結果。</p>:<><div className="loc-chip-list">{runeResult.runes.map(rune=><span key={rune}>{rune}</span>)}</div>{runeResult.semantic_hits.length?<div className="loc-context-list">{runeResult.semantic_hits.map((hit,index)=><article className="loc-context-item compact" key={`${hit.rule}-${hit.index}-${hit.rune}-${index}`}><div className="loc-result-meta"><span>{hit.operation}</span><span>{hit.group}</span></div><b>{hit.pattern} → {hit.rune}</b><small>{hit.reason}</small></article>)}</div>:<p className="loc-status">目前沒有完成語意判定；字面命中只保留為候選。</p>}{runeResult.candidates.length>0&&<p className="loc-status">待語境確認：{runeResult.candidates.map(x=>x.rune).join('、')}</p>}{runeResult.deferred.length>0&&<p className="loc-status">DEFER：{runeResult.deferred.map(x=>x.rune).join('、')}</p>}</>}</section>
    <section className="loc-card"><p className="loc-eyebrow">LOC Group Reference</p><h2>一般群組分類</h2>{!result?<p className="loc-status">輸入文字後會立即顯示結果。</p>:<><div className="loc-chip-list">{result.matches.map(item=><span key={item.id}>{item.name}{item.hits.length?` · ${item.hits.join('、')}`:' · fallback'}</span>)}</div><p className="loc-status">此區保留一般 LOC 群組分類；不以 LunaRunes 規則取代其他文化或語言的分類方法。</p></>}</section>
  </section>;
}
