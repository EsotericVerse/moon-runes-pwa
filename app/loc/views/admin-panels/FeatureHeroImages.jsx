'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSWRConfig} from 'swr';
import dynamic from 'next/dynamic';
import UiText from '../../../i18n/UiText';
import {invalidateScopeBlockPage,selectScopeBlocks} from '../../scope-data';
import {HomeBlock} from '../../home-block-model';
import {heroImageUrl as imageUrlOf} from '../../hero-image.mjs';
import {useEditDockForm} from '../../../modular/edit-dock';

const ScopeEditableBlocks=dynamic(()=>import('../../ScopeEditableBlocks'),{loading:()=>null});

const FEATURES=Object.freeze([
  {id:'culture',label:'文化'},
  {id:'statics',label:'統計'},
  {id:'search',label:'搜尋'},
  {id:'trace',label:'痕跡'},
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
function pageFor(kind,feature){return kind==='group'&&feature.id==='trace'?'group_governance':kind+'_'+feature.id;}


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
      invalidateScopeBlockPage('loc',page);
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

    </div>
    <button type="button" className="loc-button" disabled={busy||rows===null||!dirty}
      onClick={save}>{busy?'儲存中…':'儲存 Hero 圖片路徑'}</button>
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </label>;
}

// Four compact Scope titles plus five LOC titles, all Admin-owned.
// Keep the historic group_manage rows and one scope_manage/order 1 image.
function ManagementHeroCopyFields({onDirtyChange}){
  const {mutate}=useSWRConfig();
  const [rows,setRows]=useState(null);
  const [drafts,setDrafts]=useState({});
  const initial=useRef('');
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const slots=HomeBlock.MANAGEMENT_HERO_SLOTS;
  useEffect(()=>{
    let live=true;
    (async()=>{
      try{
        const data=await selectScopeBlocks('loc','group_manage');
        if(!live)return;
        const titles=Object.fromEntries(slots.map(slot=>{
          const row=(data||[]).find(value=>Number(value.block_order)===slot.order);
          return [slot.key,String(row?.block_title||slot.label)];
        }));
        setRows(data);
        setDrafts(titles);
        initial.current=JSON.stringify(titles);
        setStatus('');
      }catch(error){if(live)setStatus(String(error?.message||'讀取失敗。'));}
    })();
    return()=>{live=false;};
  },[revision]);
  const dirty=rows!==null&&JSON.stringify(drafts)!==initial.current;
  useEffect(()=>{
    onDirtyChange?.('management-copy',dirty);
    return()=>onDirtyChange?.('management-copy',false);
  },[dirty,onDirtyChange]);
  async function save(){
    if(busy||rows===null)return false;
    setBusy(true);setStatus('');
    try{
      const {updateRows,insertRows}=await import('../../db-client.mjs');
      const before=JSON.parse(initial.current||'{}');
      for(const slot of slots){
        const title=String(drafts[slot.key]||'').trim();
        if(title.length===0||title.length>64)
          throw new Error(slot.label+'：標題須為 1 至 64 字。');
        if(before[slot.key]===drafts[slot.key])continue;
        const original=(rows||[]).find(row=>Number(row.block_order)===slot.order);
        if(original?.uid){
          // Only change the title; preserve all existing eyebrow/subtitle/body.
          const {error}=await updateRows('silver.loc_blocks',{block_title:title},
            {filters:[{column:'uid',operator:'eq',value:original.uid}]});
          if(error)throw new Error(error.message);
        }else{
          const {error}=await insertRows('silver.loc_blocks',[{
            uid:HomeBlock.createUid(),page_name:'group_manage',block_order:slot.order,
            block_entity:[],block_image:null,block_title:title,
            block_eyebrow:'',block_subtitle:'',block_text:''
          }]);
          if(error)throw new Error(error.message);
        }
      }
      invalidateScopeBlockPage('loc','group_manage');
      await mutate(['scope-blocks','loc','group_manage']);
      await mutate(['app-bootstrap','loc','group_manage']);
      setStatus('管理頁標題已儲存。');
      setRevision(v=>v+1);
      return true;
    }catch(error){setStatus(String(error?.message||'儲存失敗。'));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({save,isBusy:()=>busy,isDirty:()=>dirty});
  return <div className="management-hero-copy-editor">
    <p className="scope-status">「頁面控管」沿用一張 Hero 圖。只需修改入口顯示的標題，不改動各功能的公開頁 Hero。</p>
    {['scope','loc'].map(audience=><section key={audience} className="management-hero-copy-group">
      <h4>{audience==='scope'?'Scope 管理（四個標題）':'LOC 管理（五個標題；系統管理限 Admin）'}</h4>
      <div className="management-hero-copy-grid">
        {slots.filter(slot=>slot.audience===audience).map(slot=><label className="management-hero-copy-row" key={slot.key}>
          <span>{slot.label}</span>
          <input type="text" maxLength={64} required
            disabled={rows===null||busy} aria-label={slot.label+' Hero 標題'}
            value={drafts[slot.key]||''}
            onChange={e=>setDrafts(current=>({...current,[slot.key]:e.target.value}))}/>
        </label>)}
      </div>
    </section>)}
    {status?<p role="status" className="scope-status">{status}</p>:null}
    <button className="loc-button primary" type="button" disabled={busy||rows===null||!dirty} onClick={save}>
      {busy?'儲存中…':'儲存管理頁標題'}
    </button>
  </div>;
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
      {FEATURES.map(item=><button type="button" key={item.id}
        className={'loc-button'+(item.id===feature.id?' primary':'')}
        aria-pressed={item.id===feature.id}
        onClick={()=>selectFeature(item.id)}>{item.label}</button>)}
    </div>
    <section className="loc-card scope-inline-card" key={feature.id}>
      <h3>{feature.label}</h3>
      {feature.id==='manage'?<ManagementHeroCopyFields onDirtyChange={trackDirty}/>:<ScopeEditableBlocks
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
      />}
      <div className="scope-management-fields">
        {(feature.singleSlot?SINGLE_VARIANT:SCOPE_VARIANTS).map(variant=><ImageSlot feature={feature} variant={variant} onDirtyChange={trackDirty} key={feature.id+variant.kind}/>)}
      </div>
    </section>
  </section>;
}
