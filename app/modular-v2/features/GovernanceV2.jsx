'use client';

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
      Object.freeze({eyebrow:'管理者功能',title:'治理管理',text:'版本、權限、資料狀態與公開設定集中由管理者功能處理。',href:'manage'})
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

export default function GovernanceV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const profile=PROFILES[scopeId]||genericProfile(scope);
  return <FeaturePageV2 featureId="governance" subtitle={profile.subtitle}>
    {profile.cards.map(card=><ScopeCardV2 key={card.title} eyebrow={card.eyebrow} title={card.title}><p>{card.text}</p>{card.href?<p><a href={scopeHrefV2(scopeId,card.href)}>進入管理者功能</a></p>:null}</ScopeCardV2>)}
  </FeaturePageV2>;
}
