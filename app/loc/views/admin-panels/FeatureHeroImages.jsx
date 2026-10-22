'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import UiText from '../../../i18n/UiText';
import {selectScopeBlocks} from '../../scope-data';
import {HomeBlock} from '../../home-block-model';

// The four feature pages (文化/統計/搜尋/治理) each carry one shared hero:
// a title/text block admin edits from loc.lo3rwang.cc itself (the
// explicitEditButton editor below, on the group_<feature> page -- the same
// page its own image override lives on), plus one background image that
// differs by scope kind -- the LOC/group view and a regular Scope view use
// two different pictures, 4 features x 2 kinds = 8 slots. No new table and
// no new column: all 8 are plain silver.loc_blocks rows, told apart purely
// by page_name -- symmetric "<kind>_<feature>" pages, one row each
// (block_order always 1, never repurposed to mean "which feature"):
// group_culture / scope_culture, group_statics / scope_statics,
// group_search / scope_search, group_governance / scope_governance. Only
// the group_<feature> row ever carries text; scope_<feature> is image-only.
const ScopeEditableBlocks=dynamic(()=>import('../../ScopeEditableBlocks'),{loading:()=>null});

// admin／manage／setting (/admin、各Scope的/governance/manage、local的
// /local/setting) 各自只有一張圖（singleSlot:true），不像上面四個功能頁
// 一樣有 LOC／一般Scope 兩種變體：這三頁都固定只在一個Scope底下顯示
// （admin 永遠是 scopeId==='admin'、setting 永遠是 scopeId==='local'，
// manage 永遠不會是 scopeId==='loc'，因為 loc 自己的管理入口是走
// /admin），group_<feature> 那一欄用不到；也不提供文字編輯器，標題固定
// 沿用既有文案，不走 LOC 可編輯的共用 hero 文字。
const FEATURES=Object.freeze([
  {id:'culture',label:'文化'},
  {id:'statics',label:'統計'},
  {id:'search',label:'搜尋'},
  {id:'governance',label:'治理'},
  {id:'admin',label:'系統管理'},
  {id:'manage',label:'頁面控管'},
  {id:'setting',label:'個人設定'}
].map(feature=>({...feature,singleSlot:HomeBlock.shouldUseSingleFeatureHeroImage(feature.id)})));
const SCOPE_VARIANTS=Object.freeze([
  {kind:'group',label:'LOC（group）首頁圖'},
  {kind:'scope',label:'一般 Scope（scope）首頁圖'}
]);
const SINGLE_VARIANT=Object.freeze([
  {kind:'scope',label:'首頁圖'}
]);
function pageFor(kind,feature){return kind+'_'+feature.id;}

function imageUrlOf(row){
  const image=row?.block_image;
  if(!image)return '';
  if(typeof image==='string'){
    try{const parsed=JSON.parse(image);return String(parsed?.url||'');}catch{return '';}
  }
  return String(image?.url||'');
}

function ImageSlot({feature,variant}){
  const page=pageFor(variant.kind,feature);
  const order=1;
  const [rows,setRows]=useState(null);
  const [value,setValue]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const data=await selectScopeBlocks('loc',page);
        if(!active)return;
        setRows(data);
        const row=(data||[]).find(item=>Number(item.block_order)===order);
        setValue(imageUrlOf(row));
      }catch(error){
        if(active)setStatus(error?.message||'讀取失敗。');
      }
    })();
    return()=>{active=false};
  },[page,order,revision]);

  async function save(){
    setBusy(true);setStatus('');
    try{
      const {updateRows,insertRows}=await import('../../db-client.mjs');
      const table='silver.loc_blocks';
      const existing=(rows||[]).find(item=>Number(item.block_order)===order);
      const trimmed=value.trim();
      const image=trimmed?{source:'custom',url:trimmed}:null;
      if(existing?.uid){
        const {error}=await updateRows(table,{block_image:image},{filters:[{column:'uid',operator:'eq',value:existing.uid}]});
        if(error)throw new Error(error.message||'儲存失敗。');
      }else{
        const {error}=await insertRows(table,[{page_name:page,block_order:order,block_image:image}]);
        if(error)throw new Error(error.message||'儲存失敗。');
      }
      setStatus('已更新。');
      setRevision(v=>v+1);
    }catch(error){
      setStatus(error?.message||'儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <label>
    <span>{variant.label}</span>
    <div className="admin-theme-token-input">
      <input
        type="url"
        placeholder="https://loc.lo3rwang.cc/pics/..."
        value={value}
        disabled={rows===null}
        onChange={event=>setValue(event.target.value)}
      />
      <button type="button" className="loc-button" disabled={busy||rows===null} onClick={save}>
        <UiText id="uiExtra.adminView.saveThemeSettings"/>
      </button>
    </div>
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </label>;
}

export default function FeatureHeroImages(){
  return <section className="loc-card admin-workspace">
    <h2>功能首頁圖設定</h2>
    <p className="scope-status">
      管理文化／統計／搜尋／治理四個功能頁共用的 hero 標題文字，以及各自的首頁圖片
      （LOC／一般 Scope 各一張，共 8 張）。圖片留空並儲存＝清除覆蓋，頁面改用既有的
      預設圖片，不會變成沒有圖。系統管理／頁面控管／個人設定三頁固定
      只在單一Scope下顯示，標題文字沿用既有文案（不走此處的共用文字編輯器），
      各只有一張首頁圖。
    </p>
    {FEATURES.map(feature=>{
      return <section className="loc-card scope-inline-card" key={feature.id}>
        <h3>{feature.label}</h3>
        {feature.singleSlot?null:<ScopeEditableBlocks
          scopeId="loc"
          page={HomeBlock.featureHeroPageFor(feature.id)}
          orders={[1]}
          containerless
          slotClassName="loc-card"
          editSlotClassName="loc-card"
          placeholderFirstOrder={1}
          allowEditing
          explicitEditButton
          allowDelete={false}
          allowEntities={false}
        />}
        <div className="scope-management-fields">
          {(feature.singleSlot?SINGLE_VARIANT:SCOPE_VARIANTS).map(variant=><ImageSlot feature={feature} variant={variant} key={variant.kind}/>)}
        </div>
      </section>;
    })}
  </section>;
}
