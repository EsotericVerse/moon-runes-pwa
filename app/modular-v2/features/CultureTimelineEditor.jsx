'use client';

import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {FEATURE_LOADING_MESSAGE} from '../feature-data-state.v2';

const EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['period','時期'],['event','事件']
]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(EDITABLE_TYPES));
const BLANK=Object.freeze({
  record_id:'',record_type:'anchor',label:'',resource_id:'',note:'',time_date:'',
  before_id:'0',after_id:'0',status:'',display_order:'',date_status:'exact',year_value:'',visibility:''
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

export default function CultureTimelineEditor({scopeId='lo3rwang'}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const runtimeScope=String(scopeId||'');
  const dataScope=runtimeScope==='loc'?'lo3rwang':(runtimeScope==='lunarunes'?'lrunes':runtimeScope);
  const supported=['lo3rwang','lrunes'].includes(dataScope);
  const [draft,setDraft]=useState({...BLANK});
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const query=useQuery({
    queryKey:['culture-period-settings',dataScope],
    enabled:supported&&Boolean(account.user),
    queryFn:async()=>{
      const {rows}=await selectNeonRows('silver.manage',{
        columns:'record_id,record_type,scope_id,label,resource_id,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility',
        filters:[
          {column:'scope_id',operator:'eq',value:dataScope},
          {column:'record_type',operator:'in',value:['anchor','period','event']}
        ],
        limit:5000
      });
      return rows;
    },
    staleTime:20_000
  });

  const rawRows=query.data||[];
  const anchors=useMemo(()=>new Map(rawRows
    .filter(row=>row.record_type==='anchor'&&row.resource_id)
    .map(row=>[String(row.resource_id),row])),[rawRows]);
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

  if(!supported||account.loading||account.permissionLoading||!account.canManageScopeSync(dataScope))return null;

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
      const payload={
        record_type:type,
        scope_id:dataScope,
        label,
        resource_id:resourceId,
        note:String(draft.note||'').trim()||null,
        status:String(draft.status||'').trim()||null,
        display_order:draft.display_order===''?null:Number(draft.display_order),
        visibility:String(draft.visibility||'').trim()||null,
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
        const {record_type,scope_id,...patch}=payload;
        await updateNeonRows('silver.manage',patch,{filters:[
          {column:'record_id',operator:'eq',value:selectedId},
          {column:'scope_id',operator:'eq',value:dataScope}
        ]});
      }else{
        await insertNeonRows('silver.manage',[payload]);
      }
      await queryClient.invalidateQueries({queryKey:['culture-period-settings',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      await queryClient.invalidateQueries({queryKey:['context-graph',dataScope]});
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
      const references=rawRows.filter(row=>row.record_type!=='anchor'&&splitPair(row.anchor_pair).before===id||row.record_type!=='anchor'&&splitPair(row.anchor_pair).after===id);
      if(references.length){setMessage('此定錨點仍被時期或事件使用，請先調整引用。');return;}
    }
    setBusy(true);setMessage('');
    try{
      await deleteNeonRows('silver.manage',{filters:[
        {column:'record_id',operator:'eq',value:selectedId},
        {column:'scope_id',operator:'eq',value:dataScope}
      ]});
      await queryClient.invalidateQueries({queryKey:['culture-period-settings',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      await queryClient.invalidateQueries({queryKey:['context-graph',dataScope]});
      setSelectedId('');setDraft({...BLANK});setMessage('已刪除。');
    }catch(error){setMessage(error?.message||'刪除失敗。');}
    finally{setBusy(false);}
  };

  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Culture Option</p>
    <h2>時期設定</h2>
    <p>定錨點只能在這裡新增；時間長河只負責顯示。時期與事件共用前／後兩個定錨點，0 代表該方向不存在。</p>
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    <div className="scope-v2-tabs">
      {EDITABLE_TYPES.map(([type,label])=><button key={type} type="button" onClick={()=>beginAdd(type)}>新增{label}</button>)}
    </div>
    <div className="scope-v2-timeline">
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
      <label><span>類型</span><select className="scope-v2-select" value={draft.record_type} disabled={Boolean(selectedId)} onChange={event=>change('record_type',event.target.value)}>
        {EDITABLE_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}
      </select></label>
      <label><span>名稱</span><input className="scope-v2-search-input" value={draft.label||''} onChange={event=>change('label',event.target.value)} required/></label>
      <label><span>識別</span><input className="scope-v2-search-input" value={draft.resource_id||''} disabled={Boolean(selectedId)} onChange={event=>change('resource_id',event.target.value)} placeholder="留空自動產生"/></label>
      <label><span>說明</span><textarea className="scope-v2-search-input" value={draft.note||''} onChange={event=>change('note',event.target.value)}/></label>

      {draft.record_type==='anchor'?<div className="scope-v2-stat-controls">
        <label><span>日期</span><input className="scope-v2-select" type="date" value={dateText(draft.time_date)} onChange={event=>change('time_date',event.target.value)}/></label>
        <label><span>日期未知時的年份</span><input className="scope-v2-search-input" type="number" value={draft.year_value??''} onChange={event=>change('year_value',event.target.value)}/></label>
      </div>:null}

      {draft.record_type!=='anchor'?<div className="scope-v2-stat-controls">
        <label><span>前定錨點</span><select className="scope-v2-select" value={draft.before_id||'0'} onChange={event=>change('before_id',event.target.value)}>
          <option value="0">0｜之前不存在</option>
          {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'未知'}｜{row.label}</option>)}
        </select></label>
        <label><span>後定錨點</span><select className="scope-v2-select" value={draft.after_id||'0'} onChange={event=>change('after_id',event.target.value)}>
          <option value="0">0｜之後不存在／Current</option>
          {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'未知'}｜{row.label}</option>)}
        </select></label>
      </div>:null}

      <div className="scope-v2-stat-controls">
        <label><span>狀態</span><input className="scope-v2-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>
        {draft.record_type==='period'?<label><span>排序</span><input className="scope-v2-search-input" type="number" value={draft.display_order??''} onChange={event=>change('display_order',event.target.value)}/></label>:null}
      </div>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
      <div className="scope-v2-tabs">
        <button type="submit" disabled={busy}>{busy?'儲存中…':'儲存'}</button>
        {selectedId?<button type="button" disabled={busy} onClick={remove}>刪除</button>:null}
      </div>
    </form>
  </section>;
}
