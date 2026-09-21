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


const LEGACY_PRINCIPLES=Object.freeze([
  ['共同治理主旨','LOC、月之符文與作者 Scope 共用：免費整理、只供參考、不裁決。系統幫你看見軌跡，但不替你決定你是誰。'],
  ['工具、語言與作者世界','LOC 是工具，用來整理、分析、搜尋與呈現；月之符文是語言，保留自身的符號、語彙與文化形式；作者 Scope 是創作者自己的資料與世界。三者可以互相連結，但不互相取代。']
]);

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

const GOVERNANCE_BOXES=Object.freeze({
  loc:Object.freeze([
    Object.freeze({eyebrow:'LOC · Tool Boundary',title:'工具邊界',text:'LOC 以現行 Canon、Scope 與 Feature 組成工具結構；它負責整理、分析、搜尋與呈現，不把工具輸出的結果升格為命令或裁決。'}),
    Object.freeze({eyebrow:'Scope · Data',title:'資料與責任',text:'每個 Scope 管理自己的資料、身份與公開邊界；共用功能只讀授權 projection，不因功能整合而混合資料權威。'}),
    Object.freeze({eyebrow:'Tone · Governance',title:'治理態度',text:'LOC 提供整理、分析與管理工具，不替使用者決定信念、價值或人生方向。規則先說清楚，判斷保留給使用者。'}),
    Object.freeze({eyebrow:'Copyright · Copyleft',title:'版權',text:'核心內容可供閱讀、研究、參考與依授權條件延伸，但應保留 Lucas Oscar Wang 政德／lo3rwang 的作者紀錄與來源脈絡。'})
  ]),
  runes:Object.freeze([
    Object.freeze({eyebrow:'Spec',title:'定義優先',text:'遇到高歧義或容易被字面帶偏的詞，先以 Spec 確認定義與描述主體，再建立關鍵詞、方向與延伸描述。'}),
    Object.freeze({eyebrow:'Grammar · Group',title:'詞性與群組',text:'先判斷詞彙在文本中的實際詞性，再依 LunaRunes 群組所代表的語意場域與主體性分類，不只依字面映射。'}),
    Object.freeze({eyebrow:'Culture · Interpretation',title:'符文與理解',text:'符文、抽籤與籤詩保留文化與創作形式，用於整理感受、觀察脈絡與提出理解方向；不替人下命令，也不取代個人判斷。'}),
    Object.freeze({eyebrow:'Canon · History',title:'現行與歷史',text:'現行符文以凍結 Canon 為準；歷史版本保留作為演變紀錄，不反向覆寫目前定義。'})
  ]),
  default:Object.freeze([
    Object.freeze({eyebrow:'Principles',title:'原則',text:'此 Scope 依自身定義與資料邊界運作；歷史資料保留作為來源，現行內容依目前治理規則維護。'}),
    Object.freeze({eyebrow:'Scope · Data',title:'資料與責任',text:'資料、身份與公開邊界由各自 Scope 管理；共用功能只讀授權 projection。'}),
    Object.freeze({eyebrow:'Tone · Governance',title:'治理態度',text:'治理提供整理、分析與管理工具，不替使用者決定信念、價值或人生方向。'}),
    Object.freeze({eyebrow:'Copyright · Copyleft',title:'版權',text:'核心內容可供閱讀、研究、參考與依授權條件延伸，但應保留作者紀錄與來源脈絡。'})
  ])
});

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
    {scopeId!=='admin'?<ScopeCardV2 eyebrow="Shared Governance Principles" title="三者共用的治理主旨"><div className="scope-v2-list">{LEGACY_PRINCIPLES.map(([title,text])=><article className="scope-v2-inline-card" key={title}><strong>{title}</strong><p>{text}</p></article>)}</div></ScopeCardV2>:null}
    {profile.cards.map((card,index)=><section id={index===0?'governance-concepts':index===1?'governance-law':'governance-management'} key={card.title}><ScopeCardV2 eyebrow={card.eyebrow} title={card.title}><p>{card.text}</p>{card.links?.filter(link=>!link.globalOnly||scopeId==='loc').map(link=><p key={link.href}><a href={scopeHrefV2(scopeId,link.href)}>{link.label}</a></p>)}</ScopeCardV2></section>)}
    </div>
    <div className="scope-v2-grid-two">
      {(GOVERNANCE_BOXES[scopeId]||GOVERNANCE_BOXES.default).map(card=><ScopeCardV2 key={card.title} eyebrow={card.eyebrow} title={card.title}><p>{card.text}</p></ScopeCardV2>)}
    </div>
    {scopeId==='runes'?<ScopeCardV2 eyebrow="歷史" title="符文歷史">
      {cases.length?<div className="scope-v2-list">{cases.slice(0,6).map((item,index)=><article className="scope-v2-inline-card" key={item.order||index}><strong>{item.title||'歷史項目'}</strong>{item.after?<span>{item.after}</span>:null}</article>)}</div>:<p>目前沒有可顯示的符文歷史。</p>}
      {stages.length?<div className="scope-v2-chip-list">{stages.map((item,index)=><span key={item.order||index}>{item.label} · {item.rune_count} 符</span>)}</div>:null}
    </ScopeCardV2>:null}
  </FeaturePageV2>;
}
