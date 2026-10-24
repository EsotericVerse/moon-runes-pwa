'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSWRConfig} from 'swr';
import dynamic from 'next/dynamic';
import UiText from '../../../i18n/UiText';
import {revalidateServerMetadata,selectScopeBlocks} from '../../scope-data';
import {HomeBlock} from '../../home-block-model';
import {heroImageUrl as imageUrlOf} from '../../hero-image.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';

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


function ImageSlot({feature,variant,onDirtyChange}){
  const page=pageFor(variant.kind,feature);
  const order=1;
  const {mutate}=useSWRConfig();
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
    if(busy||rows===null)return false;
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
      await revalidateServerMetadata();
      await mutate(displayQueryKey);
      setStatus('已更新。');
      setRevision(v=>v+1);
      return true;
    }catch(error){
      setStatus(error?.message||'儲存失敗。');
      return false;
    }finally{
      setBusy(false);
    }
  }

  const original=rows===null?'':imageUrlOf((rows||[]).find(item=>Number(item.block_order)===order));
  const dirty=rows!==null&&value.trim()!==String(original||'').trim();
  useEffect(()=>{
    onDirtyChange?.(page,dirty);
    return ()=>onDirtyChange?.(page,false);
  },[page,dirty,onDirtyChange]);
  useEditDockForm({save,isBusy:()=>busy,isDirty:()=>dirty});

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
  const [editorRevision,setEditorRevision]=useState(0);
  const pendingEdits=useRef(new Set());
  const trackDirty=useCallback((key,dirty)=>{
    if(dirty)pendingEdits.current.add(key);
    else pendingEdits.current.delete(key);
  },[]);
  const selectFeature=id=>{
    if(id===featureId)return;
    if(pendingEdits.current.size&&!window.confirm('目前有尚未儲存的修改，確定放棄並切換功能嗎？'))return;
    pendingEdits.current.clear();
    setFeatureId(id);
  };
  const feature=FEATURES.find(item=>item.id===featureId)||FEATURES[0];
  return <section className="loc-card admin-workspace">
    <h2>功能區塊設定</h2>
    <div className="scope-preview-links" role="group" aria-label="功能區塊">
      {FEATURES.map(item=><button type="button" key={item.id} className={'loc-button'+(item.id===feature.id?' primary':'')}
        aria-pressed={item.id===feature.id} onClick={()=>selectFeature(item.id)}>{item.label}</button>)}
    </div>
    <section className="loc-card scope-inline-card" key={feature.id}>
      <h3>{feature.label}</h3>
      <ScopeEditableBlocks
        key={feature.id+':'+editorRevision}
        scopeId="loc"
        page={HomeBlock.featureHeroPageFor(feature.id)}
        orders={[1]}
        containerless
        slotClassName="loc-card"
        editSlotClassName="loc-card"
        placeholderFirstOrder={1}
        allowEditing
        authorizedByParent startInEditMode keepEditorOpen
        onEditorExit={()=>setEditorRevision(value=>value+1)}
        onDirtyChange={dirty=>trackDirty('blocks',dirty)}
        explicitEditButton
        allowDelete={false}
        allowEntities={false}
      />
      <div className="scope-management-fields">
        {(feature.singleSlot?SINGLE_VARIANT:SCOPE_VARIANTS).map(variant=><ImageSlot feature={feature} variant={variant} onDirtyChange={trackDirty} key={feature.id+variant.kind}/>)}
      </div>
    </section>
  </section>;
}
