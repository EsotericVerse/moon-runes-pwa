'use client';

import {useEffect,useState} from 'react';
import {fetchLocJson} from '../../loc/data';
import {CULTURE_PATHS_V2} from '../../migration-bridges/current-data-compat.v2';

import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';

const PROFILES=Object.freeze({
  loc:Object.freeze({
    subtitle:'LOC 的治理入口：Current Canon、Scope 邊界、Feature 共用規格與 Page Composition。',
    cards:Object.freeze([
      Object.freeze({eyebrow:'理念',title:'Current Authority',text:'Current 由現行 Canon、Scope Registry 與 Feature Model 派生；歷史資料保留來源，但不得反向覆寫 Current。'}),
      Object.freeze({eyebrow:'法律',title:'Scope 邊界與資料責任',text:'各 Scope 保有自己的名稱、資料所有權、作者身分與公開邊界；共享功能只能讀取授權 projection。'}),
      Object.freeze({eyebrow:'管理者功能',title:'治理管理',text:'版本、權限、資料狀態與公開設定集中由治理內的管理者首頁處理。',links:[{label:'首頁管理者',href:'governance/manage'},{label:'全域管理者',href:'governance/global-manage',globalOnly:true}]})
    ])
  }),
  runes:Object.freeze({
    subtitle:'LunaRunes Scope 治理：凍結語彙、符號式語言資料、Grammar 與歷史演變。',
    cards:Object.freeze([
      Object.freeze({eyebrow:'Master Data',title:'Frozen Canon',text:'公開符文資料以凍結 Canon 為 Current；歷史版本只作來源與演變紀錄，不可覆寫現行母資料。'}),
      Object.freeze({eyebrow:'Projection',title:'Read Projection',text:'公開頁面讀取 LunaRunes 自己的 projection；共享功能不改寫其 Master Data。'})
    ])
  }),
  lo3rwang:Object.freeze({
    subtitle:'作者 Scope 治理：作者身份、作品、文化脈絡與個人資料邊界。',
    cards:Object.freeze([
      Object.freeze({eyebrow:'Identity',title:'作者身份',text:'作者 Scope 的名稱、作品、文化與作者介紹由作者 Scope 自己治理，不等同 LOC Canon。'}),
      Object.freeze({eyebrow:'Boundary',title:'個人資料邊界',text:'共享搜尋與脈絡功能只讀授權 projection，不因命中作品而擴張到未公開資料。'})
    ])
  }),
  admin:Object.freeze({
    subtitle:'Admin Scope 是管理入口；Governance 是共享 Feature，兩者不再混作同一個 Scope 身分。',
    cards:Object.freeze([
      Object.freeze({eyebrow:'Administration',title:'管理入口',text:'管理 Scope、版本、權限、資料狀態與公開設定；管理功能不改變各 Scope 的權威歸屬。'}),
      Object.freeze({eyebrow:'Separation',title:'Scope ≠ Feature',text:'Admin 是 Scope；Governance 是每個 Scope 都能使用的共享功能。這個分離由 Registry 固定。'})
    ])
  })
});

function genericProfile(scope){
  return Object.freeze({
    subtitle:`${scope.label} 的治理入口：Scope 邊界、資料投影、共用 Feature 與 Page Composition。`,
    cards:Object.freeze([
      Object.freeze({
        eyebrow:'Boundary',
        title:'Scope 邊界',
        text:'此 Scope 使用共用治理框架；名稱、資料、角色與公開投影依自身 Registry 設定，不自動繼承其他 Scope 的身份或資料所有權。'
      }),
      Object.freeze({
        eyebrow:'Composition',
        title:'Page Composition',
        text:'共用 Feature 使用同一 renderer；Scope 差異由 Registry 與資料 projection 注入。'
      })
    ])
  });
}

const LEGACY_SECTIONS=Object.freeze({
  law:{eyebrow:'Copyright',title:'版權說明',text:'公開方法與內容保留來源、作者與授權邊界；Copyleft 內容可依規則引用與延伸，商業服務、個案分析與系統實作另依合作範圍處理。'},
  faq:{eyebrow:'FAQ',title:'常見問題',text:'治理說明如何使用、引用、延伸與修正 LOC 與月之符文；不要求任何人接受或使用，所有內容均可作為分析、參考與延伸思考的材料。'},
  manage:{eyebrow:'Management',title:'管理者功能',text:'版本、權限、資料狀態與公開設定集中由治理內的管理者功能處理，不改變各 Scope 的權威歸屬。'}
});

export default function GovernanceV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const profile=PROFILES[scopeId]||genericProfile(scope);
  const [history,setHistory]=useState(null);
  useEffect(()=>{
    let live=true;
    if(scopeId!=='runes'){setHistory(null);return()=>{live=false};}
    fetchLocJson(CULTURE_PATHS_V2.runeHistory).then(value=>{if(live)setHistory(value||{});}).catch(()=>{if(live)setHistory(null);});
    return()=>{live=false};
  },[scopeId]);
  const cases=history?.semantic_history_cases||[];
  const stages=history?.system_stages||[];
  const legacy=LEGACY_SECTIONS[section];
  return <FeaturePageV2 featureId="governance" subtitle="宣示原則性與法律規定。管理也在此。">
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <div id="governance-concepts">
    {scopeId==='loc'?<ScopeCardV2 eyebrow="治理" title="治理處理如何被使用、引用、延伸與修正的原則。"><p>不要求任何人接受或使用；所有內容均可作為分析、參考與延伸思考的材料。</p></ScopeCardV2>:null}
    {profile.cards.map((card,index)=><section id={index===0?'governance-concepts':index===1?'governance-law':'governance-management'} key={card.title}><ScopeCardV2 eyebrow={card.eyebrow} title={card.title}><p>{card.text}</p>{card.links?.filter(link=>!link.globalOnly||scopeId==='loc').map(link=><p key={link.href}><a href={scopeHrefV2(scopeId,link.href)}>{link.label}</a></p>)}</ScopeCardV2></section>)}
    </div>
    <div className="scope-v2-grid-two">
      <ScopeCardV2 eyebrow="Principles" title="原則">
        <p><strong>尊重 · 和平 · 包容 · 友善</strong></p>
        <p>LOC 保持客觀與中立，不預設宗教、政治、道德或人生價值立場；任何人都可以選擇使用、引用、改寫、比較或不用。</p>
        <p>歷史保留，解釋可校準；Spec 優先，先判斷詞彙本身的詞性，再判斷群組主體性。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Copyright · Copyleft" title="版權">
        <p>核心內容可供閱讀、研究、參考與依授權條件延伸，但應保留 Lucas Oscar Wang 政德／lo3rwang 的作者紀錄與來源脈絡。</p>
        <p>開放核心不等於無償勞務；顧問、架構設計、資料整理與系統實作屬於另外的合作範圍。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Tone · Governance" title="治理態度">
        <p>可以參考，不必服從；可以延伸，不必成為同一套思想。使用與引用時尊重來源，遵守 Copyleft 與作者署名原則。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Documents" title="延伸文件">
        <p>較完整的法律、資料、版本、語意、Repository 與系統治理內容，集中由目前 Repository 文件管理。</p>
        <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">開啟 Repository 文件入口</a></p>
      </ScopeCardV2>
    </div>
    {scopeId==='runes'?<ScopeCardV2 eyebrow="歷史" title="符文歷史">
      {cases.length?<div className="scope-v2-list">{cases.slice(0,6).map((item,index)=><article className="scope-v2-inline-card" key={item.order||index}><strong>{item.title||'歷史項目'}</strong>{item.after?<span>{item.after}</span>:null}</article>)}</div>:<p>目前沒有可顯示的符文歷史。</p>}
      {stages.length?<div className="scope-v2-chip-list">{stages.map((item,index)=><span key={item.order||index}>{item.label} · {item.rune_count} 符</span>)}</div>:null}
    </ScopeCardV2>:null}
  </FeaturePageV2>;
}
