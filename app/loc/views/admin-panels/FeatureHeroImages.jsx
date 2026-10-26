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
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </label>;
}

// Independent, admin-owned management text for four Scope and five LOC entries.
// group_manage/order 1 is preserved, and scope_manage/order 1 remains image-only.
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
        const current=Object.fromEntries(slots.map(slot=>{
          const row=(data||[]).find(value=>Number(value.block_order)===slot.order);
          return [slot.key,{
            eyebrow:String(row?.block_eyebrow||''),
            title:String(row?.block_title||slot.label),
            subtitle:String(row?.block_subtitle||''),
            text:String(row?.block_text||'')
          }];
        }));
        setRows(data);
        setDrafts(current);
        initial.current=JSON.stringify(current);
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
  const patch=(key,field,value)=>setDrafts(current=>({...current,[key]:{...current[key],[field]:value}}));
  async function save(){
    if(busy||rows===null)return false;
    setBusy(true);setStatus('');
    try{
      const {updateRows,insertRows}=await import('../../db-client.mjs');
      const before=JSON.parse(initial.current||'{}');
      for(const slot of slots){
        const draft=drafts[slot.key];
        if(!draft||JSON.stringify(before[slot.key])===JSON.stringify(draft))continue;
        if(!draft.title.trim())throw new Error(slot.label+'：標題不得空白。');
        const values={
          block_eyebrow:draft.eyebrow.trim(),
          block_title:draft.title.trim(),
          block_subtitle:draft.subtitle.trim(),
          block_text:draft.text.trim()
        };
        if(values.block_title.length>64||values.block_eyebrow.length>64||values.block_subtitle.length>128)
          throw new Error(slot.label+'：文字長度超過資料庫欄位上限。');
        const original=(rows||[]).find(row=>Number(row.block_order)===slot.order);
        if(original?.uid){
          const {error}=await updateRows('silver.loc_blocks',values,{filters:[{column:'uid',operator:'eq',value:original.uid}]});
          if(error)throw new Error(error.message);
        }else{
          const {error}=await insertRows('silver.loc_blocks',[{
            uid:HomeBlock.createUid(),page_name:'group_manage',block_order:slot.order,
            block_entity:[],block_image:null,...values
          }]);
          if(error)throw new Error(error.message);
        }
      }
      invalidateScopeBlockPage('loc','group_manage');
      await mutate(['scope-blocks','loc','group_manage']);
      await mutate(['app-bootstrap','loc','group_manage']);
      setStatus('已更新。公開 JS 快照需在下一次內容發布時同步。');
      setRevision(v=>v+1);
      return true;
    }catch(error){setStatus(String(error?.message||'儲存失敗。'));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({save,isBusy:()=>busy,isDirty:()=>dirty});
  return <div className="management-hero-copy-editor">
    <p className="scope-status">共用「頁面控管」一張 Hero 圖；以下只編輯各入口顯示的文字，不會改動一般瀏覽頁 Hero。</p>
    {['scope','loc'].map(audience=><section key={audience} className="management-hero-copy-group">
      <h4>{audience==='scope'?'一般 Scope 編輯選單（四項）':'LOC 管理選單（五項；系統管理僅 Admin 可用）'}</h4>
      <div className="management-hero-copy-grid">
        {slots.filter(slot=>slot.audience===audience).map(slot=><fieldset className="management-hero-copy-card" key={slot.key} disabled={rows===null||busy}>
          <legend>{slot.label}</legend>
          <label>眉標<input type="text" maxLength={64} value={drafts[slot.key]?.eyebrow||''} onChange={e=>patch(slot.key,'eyebrow',e.target.value)}/></label>
          <label>標題<input type="text" required maxLength={64} value={drafts[slot.key]?.title||''} onChange={e=>patch(slot.key,'title',e.target.value)}/></label>
          <label>副標<input type="text" maxLength={128} value={drafts[slot.key]?.subtitle||''} onChange={e=>patch(slot.key,'subtitle',e.target.value)}/></label>
          <label>說明<textarea rows={2} value={drafts[slot.key]?.text||''} onChange={e=>patch(slot.key,'text',e.target.value)}/></label>
        </fieldset>)}
      </div>
    </section>)}
    {status?<p role="status" className="scope-status">{status}</p>:null}
    <button className="loc-button primary" type="button" disabled={busy||rows===null||!dirty} onClick={save}>
      {busy?'儲存中…':'儲存管理頁文字'}
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
