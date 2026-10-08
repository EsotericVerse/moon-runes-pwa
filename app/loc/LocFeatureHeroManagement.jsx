'use client';

import {useMemo} from 'react';
import {useAccount} from './use-account';
import ScopeEditableBlocks from './ScopeEditableBlocks';
import {FEATURE_HERO_IDS,FEATURE_HERO_ORDER,FEATURE_HERO_PAGE} from './feature-hero.mjs';

const FEATURE_LABEL=Object.freeze({
  culture:'文化',
  statics:'統計',
  search:'搜尋',
  governance:'治理'
});

function FeatureHeroPreview(slot){
  const feature=FEATURE_HERO_IDS.find(id=>FEATURE_HERO_ORDER[id]===slot.order);
  return <>
    <p className="loc-eyebrow">{FEATURE_LABEL[feature]||feature} · 最大標題框架</p>
    <div className="home-title-row">
      <h3>{slot.title||FEATURE_LABEL[feature]}</h3>
      {slot.subtitle?<div className="loc-subtitle scope-subtitle scope-shared-hero-rich"
        dangerouslySetInnerHTML={{__html:slot.subtitle}}/>:null}
    </div>
    {slot.text?<div className="scope-hero-description scope-shared-hero-rich"
      dangerouslySetInnerHTML={{__html:slot.text}}/>:null}
  </>;
}

// The editor lives only on the LOC homepage and only for a global manager.
// The four feature pages merely read these rows; they never edit them.
export default function LocFeatureHeroManagement(){
  const account=useAccount();
  const orders=useMemo(()=>FEATURE_HERO_IDS.map(id=>FEATURE_HERO_ORDER[id]),[]);
  if(!account.canManageGlobalSync())return null;
  return <details className="loc-card scope-feature-hero-management">
    <summary>四大功能頁主標題管理（文化／統計／搜尋／治理）</summary>
    <p className="scope-status">只編輯各頁最上方的最大標題文字框架；修改一次，同步套用到其他一般 Scope 的相同功能頁。月之符文維持原樣，不受影響。</p>
    <ScopeEditableBlocks
      scopeId="loc"
      page={FEATURE_HERO_PAGE}
      orders={orders}
      allowEditing
      allowDelete={false}
      allowEntities={false}
      editEyebrow={false}
      headingLevel={3}
      slotClassName="loc-card scope-feature-hero-preview"
      editSlotClassName="loc-card scope-feature-hero-preview"
      renderDisplay={FeatureHeroPreview}
    />
  </details>;
}
