'use client';

import {DB_QUERY_BATCH_SIZE} from '../../loc/query-contract.mjs';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAccount} from '../../loc/use-account';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectRows} from '../../loc/db-query.mjs';
import {FEATURE_LOADING_MESSAGE} from '../feature-data-state';

const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_ids,date_status,year_value,visibility,style_description';


const EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['period','時期'],['event','事件'],['style_comment','風格標籤']
]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(EDITABLE_TYPES));
const BLANK=Object.freeze({
  record_id:'',record_type:'anchor',label:'',resource_id:'',note:'',time_date:'',
  anchor_ids:['0','0'],status:'',display_order:'',date_status:'exact',year_value:'',visibility:'',style_description:''
});

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

export default function CultureTimelineEditor({scopeId='',selectedRecordId='',suggestedAnchorDate='',suggestedRecordType='anchor',suggestedRequestNonce=0,onClose=null}){
  const account=useAccount();
  const searchParams=useSearchParams();
  const routeSuggestedAnchorDate=String(searchParams?.get?.('anchorDate')||'').slice(0,10);
  const effectiveSuggestedAnchorDate=String(suggestedAnchorDate||routeSuggestedAnchorDate||'').slice(0,10);
  const queryClient=useQueryClient();
  const runtimeScope=String(scopeId||'').trim();
  const dataScope=runtimeScope;
  const editable=Boolean(dataScope&&dataScope!=='loc');
  const tableQuery=useQuery({
    queryKey:['scope-data',dataScope,account.email],
    enabled:editable&&Boolean(account.user),
    queryFn:async()=>account.scopeDataFor(dataScope),
    staleTime:5*60_000
  });
  const timeTable=tableQuery.data?.time||'';
  const [draft,setDraft]=useState({...BLANK});
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [formOpen,setFormOpen]=useState(false);
  const dialogRef=useRef(null);

  const query=useQuery({
    queryKey:['culture-period-settings',dataScope,timeTable],
    enabled:editable&&Boolean(account.user&&timeTable),
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
    staleTime:20_000
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
      setSelectedId(id);
      setDraft(rowDraft(row));
      setMessage('');
      setFormOpen(true);
    }
  },[selectedRecordId,rawRows]);

  useEffect(()=>{
    const recordType=EDITABLE_TYPES.some(([type])=>type===suggestedRecordType)?suggestedRecordType:'anchor';
    const hasAnchorDate=/^\d{4}-\d{2}-\d{2}$/.test(effectiveSuggestedAnchorDate);
    // All three non-anchor types share this editor; the form chooses their
    // required references: period 1–2, event 2, style_comment 1.
    if(!hasAnchorDate&&(recordType==='anchor'||!suggestedRequestNonce))return;
    setSelectedId('');
    setDraft({
      ...BLANK,
      record_type:recordType,
      time_date:recordType==='anchor'?effectiveSuggestedAnchorDate:'',
      // No date is inferred from the river: the user picks the anchor(s).
      anchor_ids:recordType==='style_comment'?[]:['0','0'],
      note:''
    });
    setMessage(recordType==='anchor'?'已帶入河道日期。':recordType==='style_comment'?'風格標籤需選 1 個定錨點。':recordType==='period'?'時期請選 1 或 2 個定錨點。':'事件需選 2 個定錨點。');
    setFormOpen(true);
  },[effectiveSuggestedAnchorDate,suggestedRecordType,suggestedRequestNonce]);

  // Native showModal puts this form in the browser top layer rather than
  // letting a non-modal open dialog disappear below the vis-timeline canvas.
  // It must be a hook, before the conditional return, to support repeated adds.
  useEffect(()=>{
    const dialog=dialogRef.current;
    if(formOpen&&dialog&&!dialog.open)dialog.showModal();
    return()=>{if(dialog?.open)dialog.close();};
  },[formOpen]);

  if(!editable||account.loading||account.permissionLoading||!account.canManageScopeSync(dataScope))return null;

  const selectRow=row=>{
    setSelectedId(String(row.record_id));
    setDraft(rowDraft(row));
    setMessage('');
  };
  const cancelEdit=()=>{
    setSelectedId('');
    setDraft({...BLANK});
    setMessage('');
    setFormOpen(false);
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

  const save=async event=>{
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const type=String(draft.record_type||'');
      const label=String(draft.label||'').trim();
      if(!label)throw new Error('請填寫名稱。');
      const resourceId=String(draft.resource_id||'').trim()||newResourceId(type);
      if(type==='style_comment'){
        const normalized=label.normalize('NFKC').toLocaleLowerCase('zh-Hant');
        const duplicate=rawRows.find(row=>row.record_type==='style_comment'&&
          String(row.label||'').trim().normalize('NFKC').toLocaleLowerCase('zh-Hant')===normalized&&
          String(row.record_id||'')!==String(selectedId||''));
        if(duplicate)throw new Error('此 Scope 已存在同名風格，每個風格名稱只能有一筆獨立敘述。');
      }
      if(type==='anchor'){
        const duplicate=rawRows.find(row=>
          row.record_type==='anchor'&&
          String(row.resource_id||'').trim()===resourceId&&
          String(row.record_id||'')!==String(selectedId||'')
        );
        if(duplicate)throw new Error('同一資料區域已存在相同定錨點識別：'+resourceId);
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
        if(!exact&&!Number.isInteger(year))throw new Error('定錨點需要日期；日期未知時至少填年份。');
        payload.time_date=exact||null;
        payload.date_status=exact?'exact':'year_only';
        payload.year_value=exact?null:year;
      }else if(type==='style_comment'){
        const styleDescription=String(draft.style_description||'').trim();
        const anchorId=String(Array.isArray(draft.anchor_ids)?draft.anchor_ids[0]||'':'').trim();
        if(!styleDescription)throw new Error('每個風格標籤必須有一段獨立的 TEXT 敘述。');
        if(!anchorId||anchorId==='0'||!anchors.has(anchorId))throw new Error('請選擇一個已建立的正式定錨點。');
        payload.style_description=styleDescription;
        payload.anchor_ids=[anchorId];
      }else{
        const ids=normalizeAnchorIds(draft.anchor_ids);
        const concrete=ids.filter(id=>id!=='0');
        // Existing 1-point/3-point historical events are never silently
        // rewritten just because the author edits an unrelated field.
        if(type==='event'&&!legacyEventUnchanged&&(ids.length!==2||concrete.length!==2)){
          throw new Error('事件必須明確選擇 2 個正式定錨點。');
        }
        if(type==='period'&&(ids.length>2||concrete.length<1||concrete.length>2)){
          throw new Error('時期必須選擇 1 或 2 個正式定錨點。');
        }
        if(ids.slice(1,-1).includes('0'))throw new Error('只有時期可在起點或終點使用開放端。');
        if(type==='event'&&!legacyEventUnchanged&&new Set(concrete).size!==2){
          throw new Error('事件必須選擇 2 個不同的正式定錨點。');
        }
        for(const id of concrete){
          if(!anchors.has(id))throw new Error('定錨點不存在：'+id);
        }
        const dated=concrete
          .map(id=>({id,date:dateText(anchors.get(id)?.time_date)}))
          .filter(item=>item.date);
        for(let index=1;index<dated.length;index+=1){
          if(dated[index-1].date>=dated[index].date){
            throw new Error('定錨點必須依時間先後排列。');
          }
        }
        payload.anchor_ids=ids;
      }
      if(selectedId){
        const {record_type,...patch}=payload;
        await updateRows(timeTable,patch,{filters:[
          {column:'record_id',operator:'eq',value:selectedId}
        ]});
      }else{
        await insertRows(timeTable,[payload]);
      }
      await queryClient.invalidateQueries({queryKey:['culture-period-settings',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      setSelectedId('');
      setDraft({...BLANK});
      setMessage('');
      setFormOpen(false);
      onClose?.();
    }catch(error){setMessage(error?.message||'儲存失敗。');}
    finally{setBusy(false);}
  };

  const remove=async()=>{
    if(!selectedId)return;
    if(draft.record_type==='anchor'){
      const id=String(draft.resource_id||'');
      const references=rawRows.filter(row=>row.record_type!=='anchor'&&normalizeAnchorIds(row.anchor_ids).includes(id));
      if(references.length){setMessage('此定錨點仍被時期、事件或風格標籤引用，請先調整引用。');return;}
    }
    setBusy(true);setMessage('');
    try{
      await deleteRows(timeTable,{filters:[
        {column:'record_id',operator:'eq',value:selectedId}
      ]});
      await queryClient.invalidateQueries({queryKey:['culture-period-settings',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      setSelectedId('');setDraft({...BLANK});setMessage('');setFormOpen(false);onClose?.();
    }catch(error){setMessage(error?.message||'刪除失敗。');}
    finally{setBusy(false);}
  };

  if(!formOpen)return null;

  return <dialog ref={dialogRef} aria-label="文化時間資料編輯器" className="scope-culture-timeline-dialog" onCancel={event=>{event.preventDefault();cancelEdit();}}>
    <section className="loc-card scope-feature-card scope-culture-inline-editor">
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    {duplicateAnchorIds.length?<p className="scope-status scope-error">同一資料區域存在重複的定錨點識別：{duplicateAnchorIds.join('、')}。請先修正，否則無法正確呈現文化資料。</p>:null}
    {query.isPending?<p className="scope-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    <form onSubmit={save}>
      <label><span>類型</span><select className="scope-select" value={draft.record_type} disabled={Boolean(selectedId)} onChange={event=>change('record_type',event.target.value)}>
        {EDITABLE_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}
      </select></label>
      {draft.record_type==='style_comment'?<label><span>風格標籤（新增／編輯）</span>
        <select className="scope-select" value={selectedId||''} onChange={event=>{
          const row=rawRows.find(item=>item.record_type==='style_comment'&&String(item.record_id)===event.target.value);
          if(row)selectRow(row);
          else {
            setSelectedId('');
            setDraft({...BLANK,record_type:'style_comment',anchor_ids:[]});
            setMessage('');
          }
        }}>
          <option value="">＋ 新增風格標籤</option>
          {rawRows.filter(row=>row.record_type==='style_comment')
            .sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),'zh-Hant'))
            .map(row=><option key={row.record_id} value={row.record_id}>
              {row.label}{row.status==='needs_anchor'?'｜尚待定錨':''}
            </option>)}
        </select>
      </label>:null}
      <label><span>{draft.record_type==='style_comment'?'風格標籤名稱（搜尋關鍵詞）':'名稱'}</span><input className="scope-search-input" value={draft.label||''} onChange={event=>change('label',event.target.value)} required/></label>
      <label><span>識別</span><input className="scope-search-input" value={draft.resource_id||''} disabled={Boolean(selectedId)} onChange={event=>change('resource_id',event.target.value)} placeholder="留空自動產生"/></label>
      {draft.record_type!=='style_comment'?<label><span>{draft.record_type==='anchor'?'定錨點說明（關鍵變化／持續檢討，非風格敘述）':'時期／事件說明（非風格敘述）'}</span><textarea className="scope-search-input" rows={5} value={draft.note||''} onChange={event=>change('note',event.target.value)}/></label>:null}
      {draft.record_type==='style_comment'?<>
        <label><span>風格專屬敘述（TEXT）</span><textarea className="scope-search-input" rows={7} value={draft.style_description||''} onChange={event=>change('style_description',event.target.value)} required placeholder="每筆風格各自保存一段說明，不與其他風格共用文字欄位"/></label>
        <label><span>唯一正式定錨點</span>
          <select className="scope-select" value={Array.isArray(draft.anchor_ids)?draft.anchor_ids[0]||'':''} onChange={event=>change('anchor_ids',event.target.value?[event.target.value]:[])} required>
            <option value="">請選擇既有定錨點</option>
            {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'年份未定'}｜{row.label}</option>)}
          </select>
        </label>
        <p className="scope-status">一個風格、一段獨立敘述、一個既有正式定錨點。可跨時期，不自動推定日期。</p>
      </>:null}
      {draft.record_type==='anchor'?<p className="scope-status">此處保存定錨點的轉折觀察，不是風格標籤；新增風格請選「＋ 新增 → 風格標籤」。</p>:null}

      {draft.record_type==='anchor'?<div className="scope-stat-controls">
        <label><span>日期</span><input className="scope-select" type="date" value={dateText(draft.time_date)} onChange={event=>change('time_date',event.target.value)}/></label>
        <label><span>日期未知時的年份</span><input className="scope-search-input" type="number" value={draft.year_value??''} onChange={event=>change('year_value',event.target.value)}/></label>
      </div>:null}

      {['period','event'].includes(draft.record_type)?<div className="scope-management-wide-field">
        <h3>定錨點</h3>
        <p className="scope-status">{draft.record_type==='period'?'時期：1 或 2 個定錨點；可以不指定起點或終點。':'事件：固定選擇 2 個定錨點。'}</p>
        {anchorOptions.length===0?<p className="scope-status scope-error">尚未建立正式定錨點，請先建立後再選取。</p>:null}
        {legacyEventUnchanged?<p className="scope-status">此舊事件原有 {legacyEventIds.length} 個定錨點；只修改其他欄位會保留原有關聯。若重新選擇起點或終點，改用新的 2 點規格。</p>:null}
        <div className="scope-management-fields">
          {chosenAnchorPair.map((anchorId,index)=><label key={index}>
            <span>{index===0?'起點定錨點':'終點定錨點'}{draft.record_type==='period'?'（選填）':''}</span>
            <select className="scope-select"
              aria-label={index===0?'選擇起點定錨點':'選擇終點定錨點'}
              value={anchorId}
              required={draft.record_type==='event'}
              onChange={event=>changeAnchor(index,event.target.value)}>
              <option value="0">{draft.record_type==='period'?'不指定（開放端）':'請選擇正式定錨點'}</option>
              {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>
                {dateText(row.time_date)||row.year_value||'年份未定'}｜{row.label}
              </option>)}
            </select>
            {anchorId!=='0'&&anchors.has(anchorId)?<span className="scope-status">{String(anchors.get(anchorId).note||'')}</span>:null}
          </label>)}
        </div>
      </div>:null}

      {draft.record_type!=='style_comment'?<div className="scope-stat-controls">
        <label><span>狀態</span><input className="scope-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>
        {draft.record_type==='period'?<label><span>排序</span><input className="scope-search-input" type="number" value={draft.display_order??''} onChange={event=>change('display_order',event.target.value)}/></label>:null}
      </div>:null}
      {message?<p className="scope-status" role="status">{message}</p>:null}
      <div className="scope-tabs">
        <button type="submit" disabled={busy}>{busy?'儲存中…':'儲存'}</button>
        <button type="button" disabled={busy} onClick={cancelEdit}>取消</button>
        {selectedId?<button type="button" disabled={busy} onClick={remove}>刪除</button>:null}
      </div>
    </form>
    </section>
  </dialog>;
}
