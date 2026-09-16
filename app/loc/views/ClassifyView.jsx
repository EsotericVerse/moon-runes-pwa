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
  const [message,setMessage]=useState('');
  const result=useMemo(()=>text.trim()?classifyText(text,profile):null,[text,profile]);
  const runeResult=useMemo(()=>text.trim()?classifyRuneSemantics(text):null,[text]);

  async function save(){
    if(!text.trim())return;
    const record=createLibraryRecord({title,text,source,classification:{...result,rune_semantics:runeResult}});
    await localRecordStorage.put(record);
    setMessage(`已存入資料庫：${record.title}`);
  }

  async function loadTextFile(event){
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      setTitle(file.name.replace(/\.[^.]+$/,''));
      setSource(`file:${file.name}`);
      setText(await file.text());
      setMessage(`已載入 ${file.name}，尚未存入資料庫。`);
    }catch(error){setMessage(`讀取失敗：${error.message}`);}
    event.target.value='';
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Local Classifier</p>
      <h1>分類</h1>
      <p className="loc-subtitle">依目前群組規則在本機分析文字，結果可直接存入資料庫。</p>
    </header>

    <section className="loc-card">
      <div className="loc-record-form">
        <label>標題<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：今天的筆記"/></label>
        <label>來源<input value={source} onChange={e=>setSource(e.target.value)} placeholder="manual / notes / file"/></label>
        <label className="wide">文字<textarea rows="10" value={text} onChange={e=>setText(e.target.value)} placeholder="貼上要分類的文字。"/></label>
      </div>
      <div className="loc-actions">
        <label className="loc-button">載入 TXT／MD<input className="loc-hidden-input" type="file" accept="text/plain,text/markdown,.txt,.md" onChange={loadTextFile}/></label>
        <button className="loc-button primary" onClick={save} disabled={!text.trim()}>分類後存入資料庫</button>
        <button className="loc-button" onClick={()=>{setTitle('');setText('');setSource('manual');setMessage('')}}>清除</button>
      </div>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Rune Algorithm · 符文演算法</p>
      <h2>完整詞義判定</h2>
      <p className="loc-subtitle">先辨識詞義，再依 AND／PLUS／OVERRIDE／DEFER 判定；字面命中只形成待判，不直接歸符文。</p>
      {!runeResult?<p className="loc-status">輸入文字後會立即顯示可解釋的 Canon 判定。</p>:<>
        {runeResult.decisions.length?<div className="loc-context-list">{runeResult.decisions.map((item,index)=><article className="loc-context-item compact" key={`${item.rule_id}-${item.start}-${index}`}>
          <div className="loc-result-meta"><span>{item.operation}</span><span>{item.runes.join(' + ')}</span></div>
          <h3>{item.text}</h3>
          <p>{item.reason}</p>
          <small>Rule: {item.rule_id}</small>
        </article>)}</div>:<p className="loc-status">沒有足夠的通則證據形成符文歸屬；保留待判，不建立逐筆例外。</p>}
        {runeResult.deferred.length?<div className="loc-note"><strong>待完整語境判別</strong><p>{runeResult.deferred.map(item=>`${item.text}：${item.reason}`).join('；')}</p></div>:null}
        <p className="loc-status">{runeResult.note} · Ruleset {runeResult.ruleset_version} · No API</p>
      </>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Classification Result</p>
      <h2>自訂群組分類</h2>
      <p className="loc-subtitle">這是使用者自訂的群組關鍵詞功能，與上述 LunaRunes 符文演算法分開呈現。</p>
      {!result?<p className="loc-status">輸入文字後會立即顯示結果。</p>:<>
        <div className="loc-chip-list">{result.matches.map(item=><span key={item.id}>{item.name}{item.hits.length?` · ${item.hits.join('、')}`:' · fallback'}</span>)}</div>
        <p className="loc-status">{result.fallback?'沒有命中自訂群組，進入預設承接組。':'只顯示實際命中的群組與關鍵詞。'}</p>
      </>}
    </section>
  </section>;
}
