'use client';

import {DB_QUERY_BATCH_SIZE} from '../../loc/query-contract.mjs';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAccount} from '../../loc/use-account';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectRows} from '../../loc/db-query.mjs';
import {FEATURE_LOADING_MESSAGE} from '../feature-data-state';

const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility,style_tags';


const EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['period','時期'],['event','事件']
]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(EDITABLE_TYPES));
const BLANK=Object.freeze({
  record_id:'',record_type:'anchor',label:'',resource_id:'',note:'',time_date:'',
  before_id:'0',after_id:'0',status:'',display_order:'',date_status:'exact',year_value:'',visibility:'',style_tags:''
});

function dateText(value){return value?String(value).slice(0,10):'';}
function splitPair(value){
  const [before='0',after='0']=String(value||'0,0').split(',',2).map(item=>String(item||'0').trim()||'0');
  return {before,after};
}
function rowDraft(row){
  if(!row)return {...BLANK};
  const pair=splitPair(row.anchor_pair);
  return {
    ...BLANK,...row,
    before_id:pair.before,
    after_id:pair.after,
    time_date:dateText(row.time_date),
    year_value:row.year_value??''
  };
}
function newResourceId(type){
  return type+':'+globalThis.crypto.randomUUID();
}
function rowSortDate(row,anchors){
  if(row.record_type==='anchor')return dateText(row.time_date)||String(row.year_value||'9999');
  const pair=splitPair(row.anchor_pair);
  return dateText(anchors.get(pair.before)?.time_date)||dateText(anchors.get(pair.after)?.time_date)||'9999-12-31';
}

export default function CultureTimelineEditor({scopeId=''}){
  const account=useAccount();
  const searchParams=useSearchParams();
  const suggestedAnchorDate=String(searchParams?.get?.('anchorDate')||'').slice(0,10);
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
    if(!/^\d{4}-\d{2}-\d{2}$/.test(suggestedAnchorDate))return;
    setSelectedId('');
    setDraft({
      ...BLANK,
      record_type:'anchor',
      time_date:suggestedAnchorDate,
      note:'系統依時間分布建議回看；請確認這段時間的實際脈絡後，再自行命名與儲存。'
    });
    setMessage('已帶入建議日期；系統不會自動建立定錨點。');
  },[suggestedAnchorDate]);

  if(!editable||account.loading||account.permissionLoading||!account.canManageScopeSync(dataScope))return null;

  const selectRow=row=>{
    setSelectedId(String(row.record_id));
    setDraft(rowDraft(row));
    setMessage('');
  };
  const beginAdd=type=>{
    setSelectedId('');
    setDraft({...BLANK,record_type:type,resource_id:''});
    setMessage('');
  };
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  const save=async event=>{
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const type=String(draft.record_type||'');
      const label=String(draft.label||'').trim();
      if(!label)throw new Error('請填寫名稱。');
      const resourceId=String(draft.resource_id||'').trim()||newResourceId(type);
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
        note:String(draft.note||'').trim()||null,
        status:String(draft.status||'').trim()||null,
        display_order:draft.display_order===''?null:Number(draft.display_order),
        visibility:String(draft.visibility||'').trim()||null,
        style_tags:String(draft.style_tags||'').trim()||null,
        time_date:null,
        anchor_pair:null,
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
      }else{
        const before=String(draft.before_id||'0');
        const after=String(draft.after_id||'0');
        if(before==='0'&&after==='0')throw new Error('時期／事件至少需要一個定錨點。');
        const beforeRow=before==='0'?null:anchors.get(before);
        const afterRow=after==='0'?null:anchors.get(after);
        if(before!=='0'&&!beforeRow)throw new Error('前定錨點不存在。');
        if(after!=='0'&&!afterRow)throw new Error('後定錨點不存在。');
        const beforeDate=dateText(beforeRow?.time_date);
        const afterDate=dateText(afterRow?.time_date);
        if(beforeDate&&afterDate&&beforeDate>=afterDate)throw new Error('後定錨點必須晚於前定錨點。');
        payload.anchor_pair=before+','+after;
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
      setMessage('已儲存。');
    }catch(error){setMessage(error?.message||'儲存失敗。');}
    finally{setBusy(false);}
  };

  const remove=async()=>{
    if(!selectedId)return;
    if(draft.record_type==='anchor'){
      const id=String(draft.resource_id||'');
      const references=rawRows.filter(row=>row.record_type!=='anchor'&&Object.values(splitPair(row.anchor_pair)).includes(id));
      if(references.length){setMessage('此定錨點仍被時期或事件使用，請先調整引用。');return;}
    }
    setBusy(true);setMessage('');
    try{
      await deleteRows(timeTable,{filters:[
        {column:'record_id',operator:'eq',value:selectedId}
      ]});
      await queryClient.invalidateQueries({queryKey:['culture-period-settings',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      setSelectedId('');setDraft({...BLANK});setMessage('已刪除。');
    }catch(error){setMessage(error?.message||'刪除失敗。');}
    finally{setBusy(false);}
  };

  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">時期與定錨</p>
    <h2>時期設定</h2>
    <p>新增或調整定錨點請在這裡處理；時間長河只呈現結果。時期與事件共用前／後兩個定錨點，沒有對應定錨時請選 0。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    {duplicateAnchorIds.length?<p className="scope-status scope-error">同一資料區域存在重複的定錨點識別：{duplicateAnchorIds.join('、')}。請先修正，否則無法正確呈現文化資料。</p>:null}
    {query.isPending?<p className="scope-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    <div className="scope-tabs">
      {EDITABLE_TYPES.map(([type,label])=><button key={type} type="button" onClick={()=>beginAdd(type)}>新增{label}</button>)}
    </div>
    <div className="scope-timeline">
      {rows.map(row=>{
        const pair=splitPair(row.anchor_pair);
        const range=row.record_type==='anchor'
          ?(dateText(row.time_date)||String(row.year_value||'日期未定'))
          :pair.before+','+pair.after;
        return <article key={row.record_id}>
          <button type="button" onClick={()=>selectRow(row)} aria-pressed={selectedId===String(row.record_id)}>
            {TYPE_LABEL[row.record_type]||row.record_type}｜{row.label||row.resource_id}
          </button>
          <small>{range}</small>
        </article>;
      })}
    </div>
    <form onSubmit={save}>
      <label><span>類型</span><select className="scope-select" value={draft.record_type} disabled={Boolean(selectedId)} onChange={event=>change('record_type',event.target.value)}>
        {EDITABLE_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}
      </select></label>
      <label><span>名稱</span><input className="scope-search-input" value={draft.label||''} onChange={event=>change('label',event.target.value)} required/></label>
      <label><span>識別</span><input className="scope-search-input" value={draft.resource_id||''} disabled={Boolean(selectedId)} onChange={event=>change('resource_id',event.target.value)} placeholder="留空自動產生"/></label>
      <label><span>說明</span><textarea className="scope-search-input" value={draft.note||''} onChange={event=>change('note',event.target.value)}/></label>

      {draft.record_type==='anchor'?<div className="scope-stat-controls">
        <label><span>日期</span><input className="scope-select" type="date" value={dateText(draft.time_date)} onChange={event=>change('time_date',event.target.value)}/></label>
        <label><span>日期未知時的年份</span><input className="scope-search-input" type="number" value={draft.year_value??''} onChange={event=>change('year_value',event.target.value)}/></label>
      </div>:null}

      {draft.record_type!=='anchor'?<div className="scope-stat-controls">
        <label><span>前定錨點</span><select className="scope-select" value={draft.before_id||'0'} onChange={event=>change('before_id',event.target.value)}>
          <option value="0">0｜之前不存在</option>
          {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'未知'}｜{row.label}</option>)}
        </select></label>
        <label><span>後定錨點</span><select className="scope-select" value={draft.after_id||'0'} onChange={event=>change('after_id',event.target.value)}>
          <option value="0">0｜之後不存在／Current</option>
          {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'未知'}｜{row.label}</option>)}
        </select></label>
      </div>:null}

      {draft.record_type!=='anchor'?<label className="scope-management-wide-field"><span>風格標籤</span><input className="scope-search-input" value={draft.style_tags||''} onChange={event=>change('style_tags',event.target.value)} placeholder="以逗號分隔；時間長河與搜尋共用"/></label>:null}

      <div className="scope-stat-controls">
        <label><span>狀態</span><input className="scope-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>
        {draft.record_type==='period'?<label><span>排序</span><input className="scope-search-input" type="number" value={draft.display_order??''} onChange={event=>change('display_order',event.target.value)}/></label>:null}
      </div>
      {message?<p className="scope-status" role="status">{message}</p>:null}
      <div className="scope-tabs">
        <button type="submit" disabled={busy}>{busy?'儲存中…':'儲存'}</button>
        {selectedId?<button type="button" disabled={busy} onClick={remove}>刪除</button>:null}
      </div>
    </form>
  </section>;
}
