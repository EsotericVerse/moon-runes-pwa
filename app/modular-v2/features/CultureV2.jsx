'use client';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {CULTURE_PATHS_V2} from '../../migration-bridges/current-data-compat.v2';
import {fetchLocJson,fetchLocStaticJson} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function periodRows(value){
  if(!value||typeof value!=='object')return [];
  for(const key of ['periods','period_analysis','period_keyword_analysis','results'])if(Array.isArray(value[key]))return value[key];
  return [];
}
function keywordsOf(row){return row?.normalized_top_keywords||row?.keywords||row?.semantic_keywords||row?.top_keywords||[];}
function itemLabel(value,index){return value?.display_label||value?.name||value?.title||value?.period||`項目 ${index+1}`;}

const PROFILE=Object.freeze({
  loc:Object.freeze({subtitle:'文化以時間累積的語言、事件、時期與治理變化為核心。作者文化時期與符文系統時期分軌展示，再以交會事件互相對照。',sections:['eras','events','runeEvolution']}),
  runes:Object.freeze({subtitle:'月之符文的時期、系統演化與語意治理時間長河。',sections:['eras','runeEvolution']}),
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
  const cultureQuery=useQuery({
    queryKey:['culture-data-v2',scopeId,profile.sections],
    queryFn:async()=>{
      const wanted=new Set(profile.sections);
      const requests=[];
      const keys=[];
      const add=(key,path,loader=fetchLocJson)=>{keys.push(key);requests.push({path,loader});};
      if(wanted.has('eras')){
        if(scopeId==='loc'){
          add('authorEras',CULTURE_PATHS_V2.eraByScope.lo3rwang,fetchLocStaticJson);
          add('runeEras',CULTURE_PATHS_V2.eraByScope.runes,fetchLocStaticJson);
        }else add('eras',CULTURE_PATHS_V2.eraByScope[scopeId]||CULTURE_PATHS_V2.eraByScope.lo3rwang,fetchLocStaticJson);
      }
      if(wanted.has('runes'))add('runes',CULTURE_PATHS_V2.runes,fetchLocStaticJson);
      if(wanted.has('authorKeywords'))add('authorKeywords',CULTURE_PATHS_V2.authorKeywords);
      if(wanted.has('periods')){add('musicPeriods',CULTURE_PATHS_V2.musicPeriods);add('writingPeriods',CULTURE_PATHS_V2.writingGovernancePeriods);}
      if(wanted.has('governanceHistory')||wanted.has('runeEvolution'))add('runeHistory',CULTURE_PATHS_V2.runeHistory,fetchLocStaticJson);
      const values=await Promise.all(requests.map(request=>request.loader(request.path)));
      return Object.fromEntries(keys.map((key,index)=>[key,values[index]]));
    },
    staleTime:5*60_000
  });
  const data=cultureQuery.data||{};
  const loading=cultureQuery.isPending;
  const error=cultureQuery.error?.message||'';


  const eraRows=useMemo(()=>[...(data.eras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.eras]);
  const authorEraRows=useMemo(()=>[...(data.authorEras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.authorEras]);
  const runeEraRows=useMemo(()=>[...(data.runeEras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.runeEras]);
  const musicRows=periodRows(data.musicPeriods);
  const writingRows=periodRows(data.writingPeriods);
  const authorKeywords=data.authorKeywords?.keywords||[];
  const runeGovernance=data.runeHistory?.governance_evolution||[];
  const runeVersions=useMemo(()=>[...(data.runeHistory?.rc_version_sequence||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.runeHistory]);
  const runeChanges=useMemo(()=>[...(data.runeHistory?.rc_change_events||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.runeHistory]);
  const runePeriods=useMemo(()=>[...(data.runeHistory?.rune_periods||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.runeHistory]);


  const galaxySection=section?.startsWith('galaxy/')?section.split('/')[1]:null;
  const galaxyCopy=GALAXY_SECTIONS[galaxySection];
  const legacy=LEGACY_SECTIONS[section];
  return <FeaturePageV2 featureId="culture" expandedPath="/culture/galaxy" subtitle={profile.subtitle}>
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    {section==='galaxy'?<ScopeCardV2 eyebrow="Galaxy" title="衍生作品"><p>由文化資料延伸出的作品入口，依創作文章、小說、音樂、圖片與多媒體分開瀏覽。</p></ScopeCardV2>:null}
    {galaxyCopy?<ScopeCardV2 eyebrow="Galaxy" title={galaxyCopy[0]}><p>{galaxyCopy[1]}</p></ScopeCardV2>:null}
    {loading?<p className="scope-v2-status">載入文化資料…</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}

    {profile.sections.includes('eras')?<ScopeCardV2 eyebrow="Culture · 時期" title={scopeId==='loc'?'作者文化時期':'時期'}>
      <CultureTimelineV2 items={scopeId==='loc'?authorEraRows:eraRows} labelOf={itemLabel} />
    </ScopeCardV2>:null}

    {profile.sections.includes('runeEvolution')?<>
      <ScopeCardV2 eyebrow="LunaRunes · 下軌" title="符文系統時期">
        <p>符文時期與作者文化時期分開計算，透過日期與交會事件相容對照；14 張是前置原型，正式版本從 P1.0 的 24 張開始，後續依 P2.0、P2.5、P3.0、P3.2、P4.0、P4.1、P4.2 展開。</p>
        {runeEraRows.length?<CultureTimelineV2 items={runeEraRows} />:null}
        <div className="scope-v2-timeline">{runeVersions.map((item,index)=><article key={`${item.version}-${item.milestone||index}`}>
          <strong>{item.version} · {item.rune_count} 張</strong>
          <span>{item.milestone||'—'} · {item.status==='rc'?'RC':'正式版本'}</span>
          {item.title?<p>{item.title}</p>:null}
        </article>)}</div>
      </ScopeCardV2>
      {runePeriods.length?<ScopeCardV2 eyebrow="Rune Membership" title="各時期的符文集合">
        <div className="scope-v2-timeline">{runePeriods.map((item,index)=><article key={item.period_id||index}>
          <strong>{item.version} · {item.rune_count} 張</strong>
          <span>{item.active_from||'—'} → {item.active_until||'現在'} · {item.status==='rc'?'RC':'正式時期'} · 小集合相容於大集合</span>
          <div className="scope-v2-chip-list">{(item.members||[]).map(name=><span key={name}>{name}</span>)}</div>
        </article>)}</div>
      </ScopeCardV2>:null}
      <ScopeCardV2 eyebrow="RC Changes" title="每次版本變更了什麼">
        <div className="scope-v2-timeline">{runeChanges.map((item,index)=><article key={`${item.order}-${item.date}-${index}`}>
          <strong>{item.date} · {item.from} → {item.to}</strong>
          <span>{item.change||'版本變更'}</span>
          {item.meaning?<p>{item.meaning}</p>:null}
        </article>)}</div>
      </ScopeCardV2>
    </>:null}

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
