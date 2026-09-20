'use client';

import {useEffect,useMemo,useState} from 'react';
import {CULTURE_PATHS_V2} from '../../migration-bridges/current-data-compat.v2';
import {fetchLocJson,fetchLocJsonBatch} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function periodRows(value){
  if(!value||typeof value!=='object')return [];
  for(const key of ['periods','period_analysis','period_keyword_analysis','results'])if(Array.isArray(value[key]))return value[key];
  return [];
}
function keywordsOf(row){return row?.normalized_top_keywords||row?.keywords||row?.semantic_keywords||row?.top_keywords||[];}

const FALLBACK_ERAS=Object.freeze([
  {era_id:'ERA-P1.0',period:'P1.0',order:1,display_label:'P1.0｜學生時代',start_date:'1980-06-23',end_date:'2003-12-15',description:'學生時代的文字與個人語言前史。'},
  {era_id:'ERA-P2.0',period:'P2.0',order:2,display_label:'P2.0｜當兵入伍到公開網路文字之前',start_date:'2003-12-16',end_date:'2009-03-24',description:'入伍後到目前已確認最早公開網路文字之前的階段。'},
  {era_id:'ERA-P3.0',period:'P3.0',order:3,display_label:'P3.0｜公開網路文字前期',start_date:'2009-03-25',end_date:'2017-06-22',description:'以目前已確認最早公開 Pixnet 公開文字為起點。'},
  {era_id:'ERA-P4.0',period:'P4.0',order:4,display_label:'P4.0｜2017-06-23 起',start_date:'2017-06-23',end_date:'2024-11-17',description:'Threads 啟動前的公開文字階段。'},
  {era_id:'ERA-P5.0',period:'P5.0',order:5,display_label:'P5.0｜Threads',start_date:'2024-11-18',end_date:'2025-02-20',description:'Threads 開始啟動後的公開文字階段。'},
  {era_id:'ERA-P5.1',period:'P5.1',order:6,display_label:'P5.1｜Suno 啟用',start_date:'2025-02-21',end_date:'2025-04-27',description:'Suno 開始啟用並進入音樂創作階段。'},
  {era_id:'ERA-P6.0',period:'P6.0',order:7,display_label:'P6.0｜《月語者》與月之符文開始',start_date:'2025-04-28',end_date:'2025-10-15',description:'小說開始，並進入月之符文相關內容形成的階段。'},
  {era_id:'ERA-P6.1',period:'P6.1',order:8,display_label:'P6.1｜LOC 啟動',start_date:'2025-10-16',end_date:'2026-01-14',description:'LOC 名稱與系統格式逐步收斂、啟動的階段。'},
  {era_id:'ERA-P6.2',period:'P6.2',order:9,display_label:'P6.2｜微月光與關係敘事期',start_date:'2026-01-15',end_date:'2026-03-08',description:'微月光、關係敘事、自我認知與陪伴主題集中的階段。'},
  {era_id:'ERA-P7.0',period:'P7.0',order:10,display_label:'P7.0｜政德風',start_date:'2026-03-09',end_date:'2026-07-31',description:'政德風成為主要治理與語言方法的階段。'},
  {era_id:'ERA-P7.1',period:'P7.1',order:11,display_label:'P7.1｜自由的風',start_date:'2026-08-01',end_date:'2026-08-31',description:'脫困、起飛、自由、選擇與重新取得主動權的階段。'},
  {era_id:'ERA-P7.2',period:'P7.2',order:12,display_label:'P7.2｜自我治理',start_date:'2026-09-01',end_date:'現在',description:'自由之後進入治理自己、整理歷史、建立秩序並主動選擇未來方向。'}
]);

function itemLabel(value,index){return value?.display_label||value?.name||value?.title||value?.period||`項目 ${index+1}`;}

const PROFILE=Object.freeze({
  loc:Object.freeze({subtitle:'文化以時間累積的語言、事件、時期與治理變化為核心。',sections:['eras','events']}),
  runes:Object.freeze({subtitle:'月之符文的文化資料。',sections:[]}),
  lo3rwang:Object.freeze({subtitle:'作者文化：時期、作品語彙、創作與治理文字在時間中的變化。',sections:['eras','authorKeywords','periods']}),
  admin:Object.freeze({subtitle:'管理 Scope 的文化頁只呈現治理變化與歷史，不取代各 Scope 的 Current Authority。',sections:['governanceHistory']})
});

const LEGACY_SECTIONS=Object.freeze({
  trajectory:{eyebrow:'Trajectory',title:'軌跡',text:'沿著時期、作品與關鍵字的變化，查看文化如何累積、轉向與留下可回查的路徑。'},
  history:{eyebrow:'History',title:'歷史演變',text:'保留歷史來源與時間順序，對照不同時期的語彙、作品、事件與治理變化；歷史資料不直接覆寫目前內容。'},
  galaxy:{eyebrow:'Galaxy',title:'衍生作品',text:'由文化資料延伸出的作品入口，依創作文章、小說、音樂、圖片與多媒體分開瀏覽。'}
});
const GALAXY_SECTIONS=Object.freeze({
  literary:['創作文章','以文章作品與文字紀錄作為文化延伸資料。'],
  novel:['小說','以小說作品、章節與長期敘事資料作為文化延伸資料。'],
  music:['音樂','以歌曲、歌詞、曲風、時期與來源作為文化延伸資料。'],
  pics:['圖片','以圖片作品與視覺資料作為文化延伸資料。'],
  multimedia:['多媒體','以 Reels、影音與其他多媒體作品作為文化延伸資料。']
});

export default function CultureV2({section=null}){
  const {scopeId}=useScopeRuntimeV2();
  const profile=PROFILE[scopeId]||PROFILE.loc;
  const [data,setData]=useState({});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');setData({});
    const wanted=new Set(profile.sections);
    const requests=[];
    const keys=[];
    const add=(key,path)=>{keys.push(key);requests.push(path);};
    if(wanted.has('eras'))add('eras',CULTURE_PATHS_V2.eraRegistry);
    if(wanted.has('events'))add('events',CULTURE_PATHS_V2.eventSnapshot);
    if(wanted.has('runes'))add('runes',CULTURE_PATHS_V2.runes);
    if(wanted.has('authorKeywords'))add('authorKeywords',CULTURE_PATHS_V2.authorKeywords);
    if(wanted.has('periods')){add('musicPeriods',CULTURE_PATHS_V2.musicPeriods);add('writingPeriods',CULTURE_PATHS_V2.writingGovernancePeriods);}
    if(wanted.has('governanceHistory'))add('runeHistory',CULTURE_PATHS_V2.runeHistory);
    fetchLocJsonBatch(requests,{concurrency:2})
      .then(values=>{if(live)setData(Object.fromEntries(keys.map((key,index)=>[key,values[index]])));})
      .catch(e=>live&&setError(String(e?.message||e)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[scopeId,profile.sections]);

  const eraRows=useMemo(()=>[...(data.eras?.eras?.length?data.eras.eras:FALLBACK_ERAS)].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.eras]);
  const eventRows=useMemo(()=>[...(data.events?.events||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[data.events]);
  const musicRows=periodRows(data.musicPeriods);
  const writingRows=periodRows(data.writingPeriods);
  const authorKeywords=data.authorKeywords?.keywords||[];
  const runeGovernance=data.runeHistory?.governance_evolution||[];

  const galaxySection=section?.startsWith('galaxy/')?section.split('/')[1]:null;
  const galaxyCopy=GALAXY_SECTIONS[galaxySection];
  const legacy=LEGACY_SECTIONS[section];
  return <FeaturePageV2 featureId="culture" expandedPath="/culture/galaxy" subtitle={profile.subtitle}>
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    {section==='galaxy'?<ScopeCardV2 eyebrow="Galaxy" title="衍生作品"><p>由文化資料延伸出的作品入口，依創作文章、小說、音樂、圖片與多媒體分開瀏覽。</p></ScopeCardV2>:null}
    {galaxyCopy?<ScopeCardV2 eyebrow="Galaxy" title={galaxyCopy[0]}><p>{galaxyCopy[1]}</p></ScopeCardV2>:null}
    {loading?<p className="scope-v2-status">載入文化資料…</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}

    {(profile.sections.includes('eras')||profile.sections.includes('events'))?<ScopeCardV2 eyebrow="Culture · Timeline" title="時期與時間線">
      <p>文化時期與事件放在同一個展示脈絡中；每個事件回到所屬時期。個人文化時期只讀 LOC 時期權威，符文系統演化另行管理，不混用。</p>
      <div className="scope-v2-timeline">
        {eraRows.map((item,index)=><article key={item.era_id||item.period||index}>
          <strong>{itemLabel(item,index)}</strong>
          <span>{item.start_date||'—'} → {item.end_date||'現在'}</span>
          {item.description?<p>{item.description}</p>:null}
        </article>)}
        {eventRows.slice(0,40).map((item,index)=><article key={item.id||`event-${index}`}>
          <strong>{item.title||itemLabel(item,index)}</strong>
          <span>{item.date||''}</span>
          {item.description?<p>{item.description}</p>:null}
        </article>)}
      </div>
    </ScopeCardV2>:null}

    {(section==='trajectory'||!section)?<ScopeCardV2 eyebrow="Trajectory" title="文化軌跡">
      <p>沿著時期、作品與關鍵字的變化，查看文化如何累積、轉向與留下可回查的路徑。</p>
      <p>軌跡是文化資料的變化展示，不把歷史資料直接覆寫成目前內容。</p>
    </ScopeCardV2>:null}

    {profile.sections.includes('authorKeywords')?<ScopeCardV2 eyebrow="Culture Keywords" title="作者文化關鍵字">
      <div className="scope-v2-chip-list">{authorKeywords.map((item,index)=><span key={item.name||index}>{item.name}</span>)}</div>
    </ScopeCardV2>:null}

    {profile.sections.includes('periods')?<div className="scope-v2-grid-two">
      <ScopeCardV2 eyebrow="Music" title="音樂時期風格">
        <div className="scope-v2-timeline">{musicRows.map((row,index)=><article key={row.period||index}>
          <strong>{row.period||row.canonical_period||`切片 ${index+1}`}</strong>
          <div className="scope-v2-chip-list">{keywordsOf(row).slice(0,10).map((item,i)=><span key={item.term||item.keyword||i}>{item.term||item.keyword}</span>)}</div>
        </article>)}</div>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Writing / Governance" title="文字與治理時期風格">
        <div className="scope-v2-timeline">{writingRows.map((row,index)=><article key={row.period||index}>
          <strong>{row.period||row.canonical_period||`切片 ${index+1}`}</strong>
          <div className="scope-v2-chip-list">{keywordsOf(row).slice(0,10).map((item,i)=><span key={item.term||item.keyword||i}>{item.term||item.keyword}</span>)}</div>
        </article>)}</div>
      </ScopeCardV2>
    </div>:null}

    {profile.sections.includes('governanceHistory')?<ScopeCardV2 eyebrow="Governance History" title="治理變化">
      <div className="scope-v2-timeline">{runeGovernance.map((item,index)=><article key={item.order||index}>
        <strong>{item.title||itemLabel(item,index)}</strong>
        {item.after?<p>{item.after}</p>:null}
        {item.effect?<small>{item.effect}</small>:null}
      </article>)}</div>
    </ScopeCardV2>:null}
  </FeaturePageV2>;
}
