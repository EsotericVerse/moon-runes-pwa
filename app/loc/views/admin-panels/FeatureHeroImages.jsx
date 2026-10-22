'use client';
import {useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import UiText from '../../../i18n/UiText';
import {selectScopeBlocks} from '../../scope-data';
import {HomeBlock} from '../../home-block-model';

const ScopeEditableBlocks=dynamic(()=>import('../../ScopeEditableBlocks'),{loading:()=>null});

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
  const queryClient=useQueryClient();
  const displayQueryKey=['scope-blocks','loc',page];
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
      await queryClient.invalidateQueries({queryKey:displayQueryKey});
      await queryClient.refetchQueries({queryKey:displayQueryKey,type:'active'});
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
  // Only the picked feature mounts: all 7 at once meant 7 block editors plus
  // ~11 image-row fetches on opening this tab, which is what made it stall.
  const [featureId,setFeatureId]=useState(FEATURES[0].id);
  const feature=FEATURES.find(item=>item.id===featureId)||FEATURES[0];
  return <section className="loc-card admin-workspace">
    <h2>功能區塊設定</h2>
    <div className="scope-preview-links" role="group" aria-label="功能區塊">
      {FEATURES.map(item=><button type="button" key={item.id} className={'loc-button'+(item.id===feature.id?' primary':'')}
        aria-pressed={item.id===feature.id} onClick={()=>setFeatureId(item.id)}>{item.label}</button>)}
    </div>
    <section className="loc-card scope-inline-card" key={feature.id}>
      <h3>{feature.label}</h3>
      <ScopeEditableBlocks
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
      />
      <div className="scope-management-fields">
        {(feature.singleSlot?SINGLE_VARIANT:SCOPE_VARIANTS).map(variant=><ImageSlot feature={feature} variant={variant} key={feature.id+variant.kind}/>)}
      </div>
    </section>
  </section>;
}
