'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson, LOC_DATA} from '../data';

const STATIC={
  algorithm:{
    eyebrow:'Algorithm',
    title:'演算法',
    intro:'LOC 的演算法頁只整理已實作或已治理的方法，不把演算法本身當成新的 Scope。',
    style:'重視可解釋、可重現、可追溯；先治理名稱、資料與規則，再執行分類、搜尋、關係與語意分析。',
    items:[
      ['語意分類','依詞性、句內角色、Scope 與語意規則進行分類。'],
      ['搜尋與排序','以 Scope、來源、語意與資料治理規則決定檢索與顯示。'],
      ['Graph / 關係運算','把事件、作品、詞彙與來源之間的關係轉成可查詢結構。'],
      ['LunaRunes Grammar','單卡、雙卡、三卡、五卡與 OW3gs 的組合語法與判定規則。'],
      ['文化分析','用時期、趨勢與軌跡觀察文字如何累積與改變。']
    ]
  },
  module:{
    eyebrow:'Module',
    title:'模組',
    intro:'模組把資料、演算法與功能組合成可以重複使用的實作單元；它不是 LOC1–8 之類的編號分類。',
    style:'每個模組有清楚輸入、資料邊界與輸出；Feature 可以跨 Scope 重用，但不取得資料所有權。',
    items:[
      ['Knowledge / RAG','把治理過的知識資產提供給搜尋與問答。'],
      ['Search','跨格式搜尋與 Scope-aware 結果呈現。'],
      ['Context Graph','事件、關係與語意圖的脈絡模組。'],
      ['LunaRunes Draw','66 符資料、抽牌語法、解讀與 Neon 紀錄。'],
      ['Governance','治理規則、版本、權限、Scope 設定與管理介面。']
    ]
  }
};

function sourceUrl(item){
  if(item?.versions?.[0]?.suno_url)return item.versions[0].suno_url;
  if(item?.url)return item.url;
  if(item?.source_refs?.[0]?.url)return item.source_refs[0].url;
  return '';
}

export default function SystemCatalogView({kind}){
  const [rows,setRows]=useState([]);
  const [scope,setScope]=useState('loc');
  const [status,setStatus]=useState(kind==='algorithm'||kind==='module'?'ready':'loading');

  useEffect(()=>{if(typeof window!=='undefined'&&window.location.hostname==='lrunes.lo3rwang.cc')setScope('runes');},[]);

  useEffect(()=>{
    let alive=true;
    if(kind==='literary'){
      fetchLocJson(LOC_DATA.WRITING_REGISTRY).then(data=>{if(alive){setRows((data?.works||[]).slice(0,24));setStatus('ready');}}).catch(()=>alive&&setStatus('error'));
    }else if(kind==='multimedia'){
      fetchLocJson(LOC_DATA.LOC_MEDIA_REGISTRY).then(data=>{if(alive){setRows((data?.items||[]).slice(0,24));setStatus('ready');}}).catch(()=>alive&&setStatus('error'));
    }else if(kind==='music'){
      fetchLocJson(LOC_DATA.MUSIC_SEARCH_MANIFEST).then(async manifest=>{
        const shards=Array.isArray(manifest?.shards)?manifest.shards:[];
        const parts=await Promise.all(shards.map(item=>{
          const path=String(typeof item==='string'?item:item.path||'');
          return fetchLocJson(path.startsWith('data/')?path:`data/json/search/loc3/${path}`);
        }));
        return parts.flatMap(part=>Array.isArray(part?.works)?part.works:[]);
      }).then(works=>{if(alive){setRows(works);setStatus('ready');}}).catch(()=>alive&&setStatus('error'));
    }
    return()=>{alive=false};
  },[kind,scope]);

  const runeRows=useMemo(()=>rows.filter(item=>{
    const text=[item.title,item.summary,item.style,item.retrieval_text,item.content_type,...(item.tags||[]),...(item.keywords||[])].filter(Boolean).join(' ').toLocaleLowerCase('zh-Hant');
    return /符文|lunarunes|rune/.test(text);
  }),[rows]);
  const visibleRows=scope==='runes'&&(kind==='music'||kind==='literary')?runeRows:rows;

  const meta=useMemo(()=>{
    if(kind==='music')return scope==='runes'?{eyebrow:'LunaRunes · Music',title:'符文歌曲',intro:'月之符文延伸到音樂創作的展示頁。作品資料直接由現有音樂資料投影，新增符合符文關聯的作品後會自動加入。',style:'符文提供語意種子、情境或主題，歌曲則把語意延伸成完整歌詞、聲音與作品。'}:{eyebrow:'Music',title:'音樂',intro:'個人音樂創作的簡介入口。這裡先看作品、曲風與時期；需要跨來源、關鍵字或語意查詢時再進進階搜尋。',style:'以單人男聲、臺灣國語為核心，作品涵蓋 Anime OP、City Pop、Dream Pop、Synthwave、Industrial Pop、抒情搖滾與 Art Pop 等方向。'};
    if(kind==='literary')return scope==='runes'?{eyebrow:'LunaRunes · Literary',title:'符文文學',intro:'月之符文延伸到小說、短文與其他文字創作的展示頁。作品資料直接由文字作品 registry 投影，新增符合符文關聯的作品後會自動加入。',style:'符文不是作品分類標籤而已，而是作品中的語意種子、情境來源或組合方法；完整作品仍保留自己的版本、來源與文學結構。'}:{eyebrow:'Literary',title:'文字創作',intro:'小說、文章與其他文字作品的入口。先看作品與寫作類型，再依需要進入進階搜尋與脈絡分析。',style:'重視敘事、語意層次、版本與來源；作品可與音樂、事件、符文與治理資料建立關聯。'};
    if(kind==='multimedia')return {eyebrow:'MultiMedia',title:'多媒體',intro:'圖像、影音、Reels 與其他跨媒介作品入口。先看媒體作品，再進入更細的搜尋或脈絡。',style:'同一概念可以用文字、圖像、聲音與影音表達；媒體資料保留平台、來源與作品關聯。'};
    return STATIC[kind];
  },[kind]);

  const items=STATIC[kind]?.items||visibleRows;
  return <main className="loc-next-main"><section className="loc-view scope-home-composition">
    <header className="loc-hero"><p className="loc-eyebrow">{meta.eyebrow}</p><h1>{meta.title}</h1><p className="loc-subtitle">{meta.intro}</p></header>
    {scope==='runes'&&(kind==='music'||kind==='literary')?<section className="loc-card">
      <p className="loc-eyebrow">Rune Content</p>
      <h2>符文內容</h2>
      <p>這裡只展示與月之符文有明確關聯的作品。關聯來自作品標題、標記、摘要或治理過的作品資料；資料新增後列表會自動更新，不需要另做一份手工清單。</p>
      <p className="loc-note">目前展示 {runeRows.length} 筆符文相關作品。</p>
    </section>:null}
    <section className="loc-card"><p className="loc-eyebrow">Style</p><h2>風格</h2><p>{meta.style}</p></section>
    <section className="loc-card"><p className="loc-eyebrow">{kind==='algorithm'||kind==='module'?'Contents':'Works'}</p><h2>{kind==='algorithm'||kind==='module'?'目前內容':'作品列表'}</h2>
      {status==='loading'?<p className="loc-status">載入作品…</p>:null}
      {status==='error'?<p className="loc-status error">作品資料目前無法載入。</p>:null}
      <div className="loc-context-list">{items.map((item,index)=>{
        const tuple=Array.isArray(item)?item:null;
        const title=tuple?tuple[0]:(item.title||item.name||item.media_id||`項目 ${index+1}`);
        const summary=tuple?tuple[1]:(item.summary||item.media_type||item.content_type||item.style||'');
        const url=tuple?'':sourceUrl(item);
        return <article className="loc-context-item" key={item.work_id||item.media_id||title}>
          <h3>{url?<a href={url} target="_blank" rel="noreferrer">{title}</a>:title}</h3>
          {summary?<p>{summary}</p>:null}
          {item.style?<small>{item.style}</small>:null}
        </article>;
      })}</div>
    </section>
    <section className="loc-card"><p className="loc-eyebrow">Advanced Search</p><h2>進階搜尋</h2><p>需要跨作品、來源、時期、關鍵字或語意關係時，再進入完整搜尋。</p><div className="loc-actions"><a className="loc-button primary" href="/search">開啟進階搜尋</a></div></section>
  </section></main>;
}
