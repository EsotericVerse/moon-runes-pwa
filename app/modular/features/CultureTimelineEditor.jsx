'use client';
import {useFeatureCopy,useUiCopy,useUiSection} from '../../i18n/ui-locale';
import featureZh from '../../i18n/features.zh_tw.js';
import {registerDefaultSection} from '../../i18n/ui-copy';
import dataErrorsZh from '../../i18n/sections/uiExtra.dataErrors.zh_tw.js';
registerDefaultSection('uiExtra.dataErrors',dataErrorsZh);



import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useAsyncResource,useResourceCache} from '../../loc/use-async-resource';

import {useEditDock} from '../edit-dock';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {revalidateServerMetadata} from '../../loc/scope-data';
import {DB_QUERY_BATCH_SIZE,selectRows} from '../../loc/db-query.mjs';


const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_ids,date_status,year_value,visibility,style_description';


const EDITABLE_TYPES=Object.freeze([
  ['anchor','anchor'],['period','period'],['event','event'],['style_comment','style']
]);
const BLANK=Object.freeze({
  record_id:'',record_type:'anchor',label:'',resource_id:'',note:'',time_date:'',
  anchor_ids:['0','0'],status:'',display_order:'',date_status:'exact',year_value:'',visibility:'',style_description:''
});

function newDraft(type='anchor'){
  return {...BLANK,record_type:type,anchor_ids:type==='style_comment'?[]:['0','0']};
}
function dateText(value){return value?String(value).slice(0,10):'';}
function normalizeAnchorIds(value){
  const source=Array.isArray(value)?value:String(value||'').split(',');
  const ids=source.map(item=>String(item||'0').trim()||'0').filter(Boolean);
  return ids.length?ids:['0','0'];
}
function rowDraft(row){
  if(!row)return {...BLANK};
  return {
    ...BLANK,...row,
    anchor_ids:row.record_type==='style_comment'?(Array.isArray(row.anchor_ids)?row.anchor_ids:[]):normalizeAnchorIds(row.anchor_ids),
    time_date:dateText(row.time_date),
    year_value:row.year_value??''
  };
}
function newResourceId(type){
  return type+':'+globalThis.crypto.randomUUID();
}
function rowSortDate(row,anchors){
  if(row.record_type==='anchor')return dateText(row.time_date)||String(row.year_value||'9999');
  const ids=normalizeAnchorIds(row.anchor_ids);
  const first=ids[0]||'0';
  const last=ids.at(-1)||'0';
  return dateText(anchors.get(first)?.time_date)||dateText(anchors.get(last)?.time_date)||'9999-12-31';
}

export default function CultureTimelineEditor({scopeId='',timeTable:providedTimeTable='',selectedRecordId='',suggestedAnchorDate='',suggestedRecordType='anchor',suggestedRequestNonce=0,defaultRecordType='anchor',onClose=null}){
  useUiSection('uiExtra.dataErrors');
  const copy=useUiCopy();
  const l=useFeatureCopy('timelineEditor',featureZh.timelineEditor);

  const editDock=useEditDock();
  const dockActions=useRef({save:null});
  const searchParams=useSearchParams();
  const routeSuggestedAnchorDate=String(searchParams?.get?.('anchorDate')||'').slice(0,10);
  const effectiveSuggestedAnchorDate=String(suggestedAnchorDate||(!selectedRecordId?routeSuggestedAnchorDate:'')||'').slice(0,10);
  const resourceCache=useResourceCache();
  const runtimeScope=String(scopeId||'').trim();
  const dataScope=runtimeScope;
  const editable=Boolean(dataScope&&dataScope!=='loc');
  const timeTable=String(providedTimeTable||'').trim();
  const defaultType=EDITABLE_TYPES.some(([type])=>type===defaultRecordType)?defaultRecordType:'anchor';
  const [draft,setDraft]=useState(()=>newDraft(defaultType));
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const initialDraftRef=useRef(newDraft(defaultType));
  const initializedRequestRef=useRef('');
  const inlineSectionRef=useRef(null);
  const nameInputRef=useRef(null);

  const query=useAsyncResource({
    queryKey:['culture-period-settings',dataScope,timeTable],
    enabled:editable&&Boolean(timeTable),
    queryFn:async()=>{
      const {rows}=await selectRows(timeTable,{
        columns:TIME_COLUMNS,
        filters:[{column:'record_type',operator:'in',value:EDITABLE_TYPES.map(([type])=>type)}],
        orders:[{column:'display_order',ascending:true},{column:'record_id',ascending:true}],
        limit:DB_QUERY_BATCH_SIZE,
        offset:0
      });
      return rows;
    },
  });

  const rawRows=query.data||[];
  const duplicateAnchorIds=useMemo(()=>{
    const seen=new Set();
    const duplicates=new Set();
    for(const row of rawRows){
      if(row.record_type!=='anchor')continue;
      const id=String(row.resource_id||'').trim();
      if(!id)continue;
      if(seen.has(id))duplicates.add(id);
      seen.add(id);
    }
    return [...duplicates].sort();
  },[rawRows]);
  const anchors=useMemo(()=>{
    const map=new Map();
    for(const row of rawRows){
      if(row.record_type!=='anchor')continue;
      const id=String(row.resource_id||'').trim();
      if(!id||map.has(id))continue;
      map.set(id,row);
    }
    return map;
  },[rawRows]);
  const anchorOptions=useMemo(()=>[...anchors.values()].sort((a,b)=>{
    const ad=dateText(a.time_date)||String(a.year_value||'9999');
    const bd=dateText(b.time_date)||String(b.year_value||'9999');
    return ad.localeCompare(bd)||String(a.label||'').localeCompare(String(b.label||''));
  }),[anchors]);
  const rows=useMemo(()=>[...rawRows].sort((a,b)=>
    rowSortDate(a,anchors).localeCompare(rowSortDate(b,anchors))||
    Number(a.display_order||0)-Number(b.display_order||0)||
    String(a.label||'').localeCompare(String(b.label||''))
  ),[rawRows,anchors]);

  useEffect(()=>{
    const id=String(selectedRecordId||'').trim();
    if(!id||!rawRows.length)return;
    const row=rawRows.find(item=>String(item.record_id)===id);
    if(row){
      if(selectedId===id&&dockActions.current.isDirty?.())return;
      setSelectedId(id);
      const initial=rowDraft(row);
      initialDraftRef.current=initial;
      setDraft(initial);
      setMessage('');
    }
  },[selectedRecordId,selectedId,rawRows]);

  useEffect(()=>{
    const recordType=EDITABLE_TYPES.some(([type])=>type===suggestedRecordType)?suggestedRecordType:'anchor';
    const hasAnchorDate=/^\d{4}-\d{2}-\d{2}$/.test(effectiveSuggestedAnchorDate);
    // All three non-anchor types share this editor; the form chooses their
    // required references: period 1–2, event 2, style_comment 1.
    if(selectedRecordId||(!hasAnchorDate&&!suggestedRequestNonce))return;
    const requestKey=suggestedRequestNonce
      ?'requested:'+suggestedRequestNonce+':'+recordType+':'+effectiveSuggestedAnchorDate
      :'route:'+recordType+':'+effectiveSuggestedAnchorDate;
    if(initializedRequestRef.current===requestKey)return;
    initializedRequestRef.current=requestKey;
    setSelectedId('');
    const initial={
      ...BLANK,
      record_type:recordType,
      time_date:recordType==='anchor'?effectiveSuggestedAnchorDate:'',
      // No date is inferred from the river: the user picks the anchor(s).
      anchor_ids:recordType==='style_comment'?[]:['0','0'],
      note:''
    };
    initialDraftRef.current=initial;
    setDraft(initial);
    setMessage(recordType==='anchor'?l.inferredAnchor:recordType==='style_comment'?l.styleNeedsAnchor:recordType==='period'?l.periodNeedsAnchor:l.eventNeedsAnchor);
  },[effectiveSuggestedAnchorDate,suggestedRecordType,suggestedRequestNonce,selectedRecordId,l]);

  // Keep the Time form in document flow, directly beneath its add controls.
  const canRenderEditor=editable&&Boolean(timeTable);
  useEffect(()=>{
    // The river remains at the top on initial load; only explicit edits focus the form.
    if(!canRenderEditor||(!selectedRecordId&&!suggestedRequestNonce))return;
    inlineSectionRef.current?.scrollIntoView({block:'nearest'});
    nameInputRef.current?.focus({preventScroll:true});
  },[canRenderEditor,selectedRecordId,suggestedRequestNonce]);
  useEffect(()=>{
    if(!editDock?.active||editDock.scopeId!==scopeId)return undefined;
    return editDock.register({
      save:options=>dockActions.current.save(options),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
  },[editDock?.active,editDock?.scopeId,editDock?.register,scopeId]);

  if(!canRenderEditor)return null;

  const cancelEdit=()=>{
    const fresh=newDraft(defaultType);
    initialDraftRef.current=fresh;
    setSelectedId('');
    setDraft(fresh);
    setMessage('');
    onClose?.();
  };
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  const changeAnchor=(index,value)=>setDraft(current=>{
    // Historical multi-point events are preserved until an anchor selector
    // is deliberately changed. A new choice uses the canonical two-point form.
    const original=normalizeAnchorIds(current.anchor_ids);
    const ids=[original[0]||'0',original.length>2?original.at(-1):original[1]||'0'];
    ids[index]=value||'0';
    return {...current,anchor_ids:ids};
  });
  const currentAnchorIds=normalizeAnchorIds(draft.anchor_ids);
  const chosenAnchorPair=[currentAnchorIds[0]||'0',currentAnchorIds.length>2?currentAnchorIds.at(-1):currentAnchorIds[1]||'0'];
  const legacyEventIds=rawRows.find(row=>String(row.record_id)===String(selectedId)&&row.record_type==='event')?.anchor_ids;
  const legacyEventUnchanged=draft.record_type==='event'&&selectedId&&
    Array.isArray(legacyEventIds)&&
    (legacyEventIds.length!==2||legacyEventIds.includes('0'))&&
    JSON.stringify(currentAnchorIds)===JSON.stringify(legacyEventIds);

  const save=async (event,{switching=false}={})=>{
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const type=String(draft.record_type||'');
      const label=String(draft.label||'').trim();
      if(!label)throw new Error(l.nameRequired);
      const resourceId=String(draft.resource_id||'').trim()||newResourceId(type);
      if(type==='style_comment'){
        const normalized=label.normalize('NFKC').toLocaleLowerCase('zh-Hant');
        const duplicate=rawRows.find(row=>row.record_type==='style_comment'&&
          String(row.label||'').trim().normalize('NFKC').toLocaleLowerCase('zh-Hant')===normalized&&
          String(row.record_id||'')!==String(selectedId||''));
        if(duplicate)throw new Error(l.duplicateStyle);
      }
      if(type==='anchor'){
        const duplicate=rawRows.find(row=>
          row.record_type==='anchor'&&
          String(row.resource_id||'').trim()===resourceId&&
          String(row.record_id||'')!==String(selectedId||'')
        );
        if(duplicate)throw new Error(l.duplicateAnchor+resourceId);
      }
      const payload={
        record_type:type,
        label,
        resource_id:resourceId,
        note:type==='style_comment'?null:String(draft.note||'').trim()||null,
        status:type==='style_comment'?'active':String(draft.status||'').trim()||null,
        display_order:draft.display_order===''?null:Number(draft.display_order),
        visibility:String(draft.visibility||'').trim()||null,
        time_date:null,
        anchor_ids:null,
        date_status:null,
        year_value:null,
        updated_at:new Date().toISOString()
      };
      if(type==='anchor'){
        const exact=dateText(draft.time_date);
        const year=draft.year_value===''?null:Number(draft.year_value);
        if(!exact&&!Number.isInteger(year))throw new Error(l.dateRequired);
        payload.time_date=exact||null;
        payload.date_status=exact?'exact':'year_only';
        payload.year_value=exact?null:year;
      }else if(type==='style_comment'){
        const styleDescription=String(draft.style_description||'').trim();
        const anchorId=String(Array.isArray(draft.anchor_ids)?draft.anchor_ids[0]||'':'').trim();
        if(!styleDescription)throw new Error(l.styleDescriptionRequired);
        if(!anchorId||anchorId==='0'||!anchors.has(anchorId))throw new Error(l.formalAnchorRequired);
        payload.style_description=styleDescription;
        payload.anchor_ids=[anchorId];
      }else{
        const ids=normalizeAnchorIds(draft.anchor_ids);
        const concrete=ids.filter(id=>id!=='0');
        // Existing 1-point/3-point historical events are never silently
        // rewritten just because the author edits an unrelated field.
        if(type==='event'&&!legacyEventUnchanged&&(ids.length!==2||concrete.length!==2)){
          throw new Error(l.eventTwo);
        }
        if(type==='period'&&(ids.length>2||concrete.length<1||concrete.length>2)){
          throw new Error(l.periodOneTwo);
        }
        if(ids.slice(1,-1).includes('0'))throw new Error(l.openPeriodOnly);
        if(type==='event'&&!legacyEventUnchanged&&new Set(concrete).size!==2){
          throw new Error(l.distinctAnchors);
        }
        for(const id of concrete){
          if(!anchors.has(id))throw new Error(l.anchorMissing+id);
        }
        const dated=concrete
          .map(id=>({id,date:dateText(anchors.get(id)?.time_date)}))
          .filter(item=>item.date);
        for(let index=1;index<dated.length;index+=1){
          if(dated[index-1].date>=dated[index].date){
            throw new Error(l.anchorOrder);
          }
        }
        payload.anchor_ids=ids;
      }
      // The target database RPC authorizes this Scope on the actual write.
      if(selectedId){
        const {record_type,...patch}=payload;
        await updateRows(timeTable,patch,{filters:[
          {column:'record_id',operator:'eq',value:selectedId}
        ]});
      }else{
        await insertRows(timeTable,[payload]);
      }
      // Invalidate R2-backed public Period navigation before SWR refetches it.
      // This also covers edits to anchor dates used as Period boundaries.
      if(dataScope!=='local')await revalidateServerMetadata();
      await resourceCache.invalidate({queryKey:['culture-time-periods',scopeId]});
      await resourceCache.invalidate({queryKey:['culture-period-settings',dataScope]});
      await resourceCache.invalidate({queryKey:['culture-timeline',scopeId]});
      const fresh=newDraft(defaultType);
      initialDraftRef.current=fresh;
      setSelectedId('');
      setDraft(fresh);
      setMessage('已儲存。');
      onClose?.();
      return true;
    }catch(error){
      const detail=error?.message||l.saveError;
      setMessage(detail);
      if(editDock?.active)editDock.setNotice(detail);
      return false;
    }
    finally{setBusy(false);}
  };

  const remove=async()=>{
    if(!selectedId)return;
    if(draft.record_type==='anchor'){
      const id=String(draft.resource_id||'');
      const references=rawRows.filter(row=>row.record_type!=='anchor'&&normalizeAnchorIds(row.anchor_ids).includes(id));
      if(references.length){setMessage(l.anchorInUse);return;}
    }
    setBusy(true);setMessage('');
    try{
      // The target database RPC authorizes this Scope on the actual write.
      await deleteRows(timeTable,{filters:[
        {column:'record_id',operator:'eq',value:selectedId}
      ]});
      // Invalidate R2-backed public Period navigation before SWR refetches it.
      // This also covers edits to anchor dates used as Period boundaries.
      if(dataScope!=='local')await revalidateServerMetadata();
      await resourceCache.invalidate({queryKey:['culture-time-periods',scopeId]});
      await resourceCache.invalidate({queryKey:['culture-period-settings',dataScope]});
      await resourceCache.invalidate({queryKey:['culture-timeline',scopeId]});
      const fresh=newDraft(defaultType);
      initialDraftRef.current=fresh;
      setSelectedId('');setDraft(fresh);setMessage('已刪除。');onClose?.();
    }catch(error){setMessage(error?.message||l.deleteError);}
    finally{setBusy(false);}
  };

  dockActions.current={
    save:options=>save({preventDefault(){}},options),
    isDirty:()=>JSON.stringify(draft)!==JSON.stringify(initialDraftRef.current),
    isBusy:()=>busy
  };
  return <section ref={inlineSectionRef} className="scope-culture-inline-editor" role="region" aria-label={l.editorTitle}>
    <header className="scope-culture-inline-heading">
      <h4>{selectedId?'編輯':'新增'}{l[draft.record_type==='style_comment'?'style':draft.record_type]}</h4>
      {selectedId?<span className="scope-status">目前編輯既有紀錄</span>:null}
    </header>
    {query.error?<p className="scope-status scope-error" role="alert">{query.error.message}</p>:null}
    {duplicateAnchorIds.length?<p className="scope-status scope-error">{l.duplicateDataPrefix}{duplicateAnchorIds.join('、')}{l.duplicateDataSuffix}</p>:null}
    {query.isPending?<p className="scope-status" role="status">{copy.uiExtra.dataErrors.loading}</p>:null}
    <form className="scope-culture-quick-form" onSubmit={save}>
      <div className="scope-culture-quick-primary">
        <label className="scope-culture-quick-name">
          <span>{draft.record_type==='style_comment'?l.styleName:l.name}</span>
          <input ref={nameInputRef} className="scope-search-input" value={draft.label||''} onChange={event=>change('label',event.target.value)} required/>
        </label>
        {draft.record_type==='anchor'?<>
          <label><span>{l.date}</span><input className="scope-select" type="date" value={dateText(draft.time_date)} onChange={event=>change('time_date',event.target.value)}/></label>
          <label><span>{l.unknownDateYear}</span><input className="scope-search-input" type="number" value={draft.year_value??''} onChange={event=>change('year_value',event.target.value)}/></label>
        </>:null}
        {draft.record_type==='style_comment'?<label>
          <span>{l.uniqueAnchor}</span>
          <select className="scope-select" value={Array.isArray(draft.anchor_ids)?draft.anchor_ids[0]||'':''} onChange={event=>change('anchor_ids',event.target.value?[event.target.value]:[])} required>
            <option value="">{l.chooseExisting}</option>
            {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||l.unknownYear}｜{row.label}</option>)}
          </select>
        </label>:null}
      </div>
      {['period','event'].includes(draft.record_type)?<div className="scope-culture-quick-anchors">
        {anchorOptions.length===0?<p className="scope-status scope-error">{l.noAnchors}</p>:null}
        {legacyEventUnchanged?<p className="scope-status">{l.legacyPrefix}{legacyEventIds.length}{l.legacySuffix}</p>:null}
        {chosenAnchorPair.map((anchorId,index)=><label key={index}>
          <span>{index===0?l.startAnchor:l.endAnchor}{draft.record_type==='period'?l.optional:''}</span>
          <select className="scope-select" aria-label={index===0?l.chooseStart:l.chooseEnd}
            value={anchorId} required={draft.record_type==='event'} onChange={event=>changeAnchor(index,event.target.value)}>
            <option value="0">{draft.record_type==='period'?l.openEnd:l.chooseFormal}</option>
            {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||l.unknownYear}｜{row.label}</option>)}
          </select>
        </label>)}
      </div>:null}
      <label className="scope-culture-quick-notes">
        <span>{draft.record_type==='style_comment'?l.styleText:draft.record_type==='anchor'?l.anchorDescription:l.periodDescription}</span>
        <textarea className="scope-search-input" rows={draft.record_type==='style_comment'?3:2}
          value={draft.record_type==='style_comment'?draft.style_description||'':draft.note||''}
          onChange={event=>change(draft.record_type==='style_comment'?'style_description':'note',event.target.value)}/>
      </label>
      <details className="scope-culture-quick-extra">
        <summary>其他設定</summary>
        <div className="scope-culture-quick-extra-fields">
          <label><span>{l.identity}</span><input className="scope-search-input" value={draft.resource_id||''} disabled={Boolean(selectedId)} onChange={event=>change('resource_id',event.target.value)} placeholder={l.autoIdentifier}/></label>
          {draft.record_type!=='style_comment'?<label><span>{l.status}</span><input className="scope-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>:null}
          {draft.record_type==='period'?<label><span>{l.sort}</span><input className="scope-search-input" type="number" value={draft.display_order??''} onChange={event=>change('display_order',event.target.value)}/></label>:null}
        </div>
      </details>
      {message?<p className="scope-status" role="status" aria-live="polite">{message}</p>:null}
      <div className="scope-culture-quick-actions">
        <button type="submit" className="loc-button" disabled={busy||query.isPending||Boolean(query.error)}>{busy?l.saving:selectedId?'儲存修改':'儲存'+l[draft.record_type==='style_comment'?'style':draft.record_type]}</button>
        <button type="button" className="loc-button" disabled={busy} onClick={cancelEdit}>{selectedId?l.cancel:'清除'}</button>
        {selectedId?<button type="button" className="loc-button" disabled={busy} onClick={remove}>{l.delete}</button>:null}
      </div>
    </form>
  </section>;
}