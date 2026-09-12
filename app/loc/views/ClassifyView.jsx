'use client';

import { useMemo, useState } from 'react';
import { putLocalRecord } from '../local-db';
import { useLocalStore } from '../local-store';
import { classifyText } from '../model/style-classifier';
import { createLibraryRecord, INITIAL_STYLE_PROFILE, STYLE_STORAGE_KEY } from '../model/style-profile';

export default function ClassifyView(){
  const {value:profile}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const [title,setTitle]=useState('');
  const [text,setText]=useState('');
  const [source,setSource]=useState('manual');
  const [message,setMessage]=useState('');
  const result=useMemo(()=>text.trim()?classifyText(text,profile):null,[text,profile]);

  async function save(){
    if(!text.trim())return;
    const record=createLibraryRecord({title,text,source,classification:result});
    await putLocalRecord(record);
    setMessage(`已存入 Library：${record.title}`);
  }

  async function loadTextFile(event){
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      setTitle(file.name.replace(/\.[^.]+$/,''));
      setSource(`file:${file.name}`);
      setText(await file.text());
      setMessage(`已載入 ${file.name}，尚未存入 Library。`);
    }catch(error){setMessage(`讀取失敗：${error.message}`);}
    event.target.value='';
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Local Classifier</p>
      <h1>分類</h1>
      <p>使用「群組設定」目前的 exact-match 規則在本機分類。結果可以直接存進 Library；不呼叫 Render，也不需要 API。</p>
    </header>

    <section className="loc-card">
      <div className="loc-record-form">
        <label>標題<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：今天的筆記"/></label>
        <label>來源<input value={source} onChange={e=>setSource(e.target.value)} placeholder="manual / notes / file"/></label>
        <label className="wide">文字<textarea rows="10" value={text} onChange={e=>setText(e.target.value)} placeholder="貼上要分類的文字。"/></label>
      </div>
      <div className="loc-actions">
        <label className="loc-button">載入 TXT／MD<input className="loc-hidden-input" type="file" accept="text/plain,text/markdown,.txt,.md" onChange={loadTextFile}/></label>
        <button className="loc-button primary" onClick={save} disabled={!text.trim()}>分類後存入 Library</button>
        <button className="loc-button" onClick={()=>{setTitle('');setText('');setSource('manual');setMessage('')}}>清除</button>
      </div>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Classification Result</p>
      <h2>分類結果</h2>
      {!result?<p className="loc-status">輸入文字後會立即顯示結果。</p>:<>
        <div className="loc-chip-list">{result.matches.map(item=><span key={item.id}>{item.name}{item.hits.length?` · ${item.hits.join('、')}`:' · fallback'}</span>)}</div>
        <p className="loc-status">{result.fallback?'沒有命中自訂群組，進入預設承接組。':'只顯示實際命中的群組與關鍵詞。'}</p>
      </>}
    </section>
  </section>;
}
