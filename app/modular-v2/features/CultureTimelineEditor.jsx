'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';

const EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['event','事件'],['period','時期'],['period_style','時期風格']
]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(EDITABLE_TYPES));
const TIME_TABLES=Object.freeze({
  lo3rwang:'silver.lo3rwang_style_time',
  lunarunes:'silver.lrunes_style_time'
});
const BLANK=Object.freeze({
  entry_key:'',entry_type:'anchor',title:'',summary:'',start_date:'',end_date:'',
  anchor_id:'',before_id:'',after_id:'',start_anchor_id:'',end_anchor_id:'',
  period:'',status:'',note:'',entry_name:'',period_style:''
});

function dateText(value){return value?String(value).slice(0,10):''}
function timeTable(scopeId){
  const table=TIME_TABLES[String(scopeId||'')];
  if(!table)throw new Error('此範圍沒有時間資料表。');
  return table;
}
function normalizeEntryType(value){return value==='style'?'period_style':value}
function addDays(value,amount){
  if(!value)return null;
  const date=new Date(`${dateText(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+amount);
  return date.toISOString().slice(0,10);
}
function effectiveRange(row,anchors){
  const start=anchors.get(row.start_anchor_id)?.start_date||row.start_date||null;
  const endBoundary=anchors.get(row.end_anchor_id)?.start_date||null;
  const endExclusive=endBoundary||(row.end_date?addDays(row.end_date,1):null);
  return {start:dateText(start),endExclusive:dateText(endExclusive)};
}
function draftFrom(row){
  if(!row)return {...BLANK};
  return {...BLANK,...row,entry_type:normalizeEntryType(row.entry_type),period_style:row.entry_name||''};
}
function rowForForm(draft,anchors){
  const entryType=normalizeEntryType(draft.entry_type);
  const payload={
    entry_key:draft.entry_key,
    entry_type:entryType,
    title:String(draft.title||'').trim(),
    summary:String(draft.summary||'').trim()||null,
    start_date:null,
    end_date:null,
    anchor_id:null,
    before_id:null,
    after_id:null,
    start_anchor_id:null,
    end_anchor_id:null,
    period:null,
    status:String(draft.status||'').trim()||null,
    note:String(draft.note||'').trim()||null,
    entry_name:String(draft.entry_name||'').trim()||null
  };
  if(!payload.title)throw new Error('請填寫名稱。');
  if(entryType==='anchor'){
    if(!draft.start_date)throw new Error('定錨點需要日期。');
    payload.start_date=dateText(draft.start_date);
    payload.anchor_id=String(draft.anchor_id||'').trim();
    if(!payload.anchor_id)throw new Error('定錨點識別不可空白。');
  }else if(entryType==='event'){
    const before=anchors.get(draft.before_id);
    const after=anchors.get(draft.after_id);
    if(!before||!after)throw new Error('事件需要選擇前後定錨點。');
    if(dateText(before.start_date)>dateText(after.start_date))throw new Error('前定錨點日期必須早於或等於後定錨點。');
    payload.before_id=before.anchor_id;
    payload.after_id=after.anchor_id;
    payload.start_anchor_id=before.anchor_id;
    payload.end_anchor_id=after.anchor_id;
    payload.start_date=dateText(before.start_date);
    payload.end_date=dateText(after.start_date);
    payload.event_id=draft.event_id||draft.entry_key;
  }else if(entryType==='period'){
    const start=anchors.get(draft.start_anchor_id);
    const end=draft.end_anchor_id?anchors.get(draft.end_anchor_id):null;
    if(!start)throw new Error('時期需要選擇起始定錨點。');
    if(draft.end_anchor_id&&!end)throw new Error('結束定錨點不存在。');
    const startDate=dateText(start.start_date);
    const endBoundary=end?dateText(end.start_date):'';
    if(endBoundary&&endBoundary<=startDate)throw new Error('結束定錨點必須晚於起始定錨點。');
    payload.start_anchor_id=start.anchor_id;
    payload.end_anchor_id=end?.anchor_id||null;
    payload.start_date=startDate;
    payload.end_date=end?addDays(end.start_date,-1):null;
    payload.period=String(draft.period||'').trim()||null;
    payload.entry_name=String(draft.entry_name||'').trim()||null;
  }else if(entryType==='period_style'){
    const start=anchors.get(draft.start_anchor_id);
    const end=draft.end_anchor_id?anchors.get(draft.end_anchor_id):null;
    const name=String(draft.period_style||draft.entry_name||'').trim();
    if(!name||!start)throw new Error('時期風格需要名稱與起始定錨點。');
    if(draft.end_anchor_id&&!end)throw new Error('結束定錨點不存在。');
    if(end&&dateText(end.start_date)<=dateText(start.start_date))throw new Error('結束定錨點必須晚於起始定錨點。');
    payload.entry_name=name;
    payload.start_anchor_id=start.anchor_id;
    payload.end_anchor_id=end?.anchor_id||null;
    payload.start_date=dateText(start.start_date);
    payload.end_date=end?addDays(end.start_date,-1):null;
  }
  return payload;
}

export default function CultureTimelineEditor({scopeId='loc',selectedEntryId='',riverCommand=null,onCapabilityChange=null}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const candidateScopes=scopeId==='loc'?['lo3rwang','lunarunes']:[scopeId];
  const [allowedScopes,setAllowedScopes]=useState([]);
  const [dataScope,setDataScope]=useState(candidateScopes[0]||'');
  const [draft,setDraft]=useState({...BLANK});
  const [selectedKey,setSelectedKey]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [editing,setEditing]=useState(false);

  useEffect(()=>{
    onCapabilityChange?.(allowedScopes.includes('lo3rwang'));
  },[allowedScopes,onCapabilityChange]);

  useEffect(()=>{
    let active=true;
    setAllowedScopes([]);
    if(account.permissionLoading||!account.user)return()=>{active=false};
    Promise.all(candidateScopes.map(async candidate=>{
      const [global,scope,page]=await Promise.all([
        account.canManageGlobal(),account.canManageScope(candidate),account.canManagePage(candidate,'culture')
      ]);
      return global||scope||page?candidate:null;
    })).then(values=>{
      if(!active)return;
      const allowed=values.filter(Boolean);
      setAllowedScopes(allowed);
      if(allowed.length&&!allowed.includes(dataScope))setDataScope(allowed[0]);
    }).catch(()=>{if(active)setAllowedScopes([])});
    return()=>{active=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal,account.canManageScope,account.canManagePage,scopeId]);

  const query=useQuery({
    queryKey:['culture-edit-data',dataScope],
    enabled:allowedScopes.includes(dataScope)&&Boolean(TIME_TABLES[dataScope]),
    queryFn:async()=>{
      const {rows}=await selectNeonRows(timeTable(dataScope),{
        columns:'entry_key,entry_type,title,summary,start_date,end_date,period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,before_id,after_id,date_status,visibility,event_id,note',
        filters:[{column:'entry_type',operator:'in',value:['anchor','event','period','period_style']}],
        orders:[{column:'start_date',ascending:true},{column:'order_no',ascending:true}],limit:1000
      });
      return {rows};
    },
    staleTime:20_000
  });
  const rows=query.data?.rows||[];
  const anchors=useMemo(()=>new Map(rows.filter(row=>row.entry_type==='anchor'&&row.anchor_id).map(row=>[row.anchor_id,row])),[rows]);
  const anchorOptions=useMemo(()=>[...anchors.values()].sort((a,b)=>dateText(a.start_date).localeCompare(dateText(b.start_date))),[anchors]);
  const periodRows=useMemo(()=>rows.filter(row=>row.entry_type==='period'),[rows]);

  const openRow=key=>{
    const row=rows.find(item=>item.entry_key===key);
    if(!row)return;
    setSelectedKey(key);
    const current=draftFrom(row);
    if(row.entry_type==='event'){
      current.before_id=row.before_id||row.start_anchor_id||'';
      current.after_id=row.after_id||row.end_anchor_id||'';
    }
    setDraft(current);
    setMessage('');
  };

  useEffect(()=>{
    if(!selectedEntryId||!allowedScopes.includes(dataScope))return;
    const separator=selectedEntryId.indexOf(':');
    const selectedScope=separator<0?'':selectedEntryId.slice(0,separator);
    const key=separator<0?'':selectedEntryId.slice(separator+1);
    if(selectedScope===dataScope&&rows.some(row=>row.entry_key===key))openRow(key);
  },[selectedEntryId,dataScope,allowedScopes,rows]);

  const beginAdd=type=>{
    setSelectedKey('');
    setDraft({...BLANK,entry_type:type});
    setMessage('');
  };

  useEffect(()=>{
    const commandScope=riverCommand?.scopeId||dataScope;
    if(!riverCommand?.nonce||!allowedScopes.includes(commandScope))return;
    setEditing(true);
    setDataScope(commandScope);
    setSelectedKey('');
    setDraft({...BLANK,entry_type:normalizeEntryType(riverCommand.type||'anchor'),...(riverCommand.values||{})});
    setMessage('已從 3D 河道帶入位置；確認名稱與前後定錨點後儲存。');
  },[riverCommand?.nonce,riverCommand?.scopeId,allowedScopes]);

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  const save=async event=>{
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const key=draft.entry_key||`${normalizeEntryType(draft.entry_type)}:${globalThis.crypto.randomUUID()}`;
      const values=rowForForm({...draft,entry_key:key,anchor_id:draft.anchor_id||key},anchors);
      if(values.entry_type==='period'){
        const candidate=effectiveRange(values,anchors);
        if(periodRows.some(row=>row.entry_key!==selectedKey&&(()=>{
          const existing=effectiveRange(row,anchors);
          return (!candidate.endExclusive||existing.start<candidate.endExclusive)&&(!existing.endExclusive||candidate.start<existing.endExclusive);
        })()))throw new Error('這段時期會與現有時期重疊。');
      }
      const table=timeTable(dataScope);
      if(selectedKey){
        const {entry_key,...patch}=values;
        await updateNeonRows(table,patch,{filters:[{column:'entry_key',operator:'eq',value:selectedKey}]});
      }else{
        await insertNeonRows(table,[values]);
      }
      await queryClient.invalidateQueries({queryKey:['culture-edit-data',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      await queryClient.invalidateQueries({queryKey:['context-graph',dataScope]});
      setSelectedKey(key);setMessage('已儲存。');
    }catch(error){setMessage(error?.message||'儲存失敗。')}
    finally{setBusy(false)}
  };

  const removeAnchor=async()=>{
    if(!selectedKey||draft.entry_type!=='anchor')return;
    const references=rows.filter(row=>row.entry_key!==selectedKey&&[
      row.before_id,row.after_id,row.start_anchor_id,row.end_anchor_id
    ].includes(draft.anchor_id));
    if(references.length){setMessage('此定錨點仍被事件、時期或時期風格使用，請先調整那些項目。');return;}
    setBusy(true);setMessage('');
    try{
      await deleteNeonRows(timeTable(dataScope),{filters:[{column:'entry_key',operator:'eq',value:selectedKey}]});
      await queryClient.invalidateQueries({queryKey:['culture-edit-data',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      await queryClient.invalidateQueries({queryKey:['context-graph',dataScope]});
      setSelectedKey('');setDraft({...BLANK});setMessage('已刪除定錨點。');
    }catch(error){setMessage(error?.message||'刪除失敗。')}
    finally{setBusy(false)}
  };

  if(!allowedScopes.length)return null;
  if(!editing)return <div className="scope-v2-tabs"><button type="button" onClick={()=>setEditing(true)}>編輯時間長河</button></div>;

  return <section className="loc-card scope-v2-feature-card">
    <h2>時間長河設定</h2>
    {allowedScopes.length>1?<label className="scope-v2-culture-period-select">
      <span>範圍</span>
      <select className="scope-v2-select" value={dataScope} onChange={event=>{setDataScope(event.target.value);setSelectedKey('');setDraft({...BLANK})}}>
        {allowedScopes.map(value=><option key={value} value={value}>{value}</option>)}
      </select>
    </label>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    {query.isPending?<p className="scope-v2-status">讀取中…</p>:null}
    <div className="scope-v2-tabs">
      {EDITABLE_TYPES.map(([type,label])=><button key={type} type="button" onClick={()=>beginAdd(type)}>新增{label}</button>)}
    </div>
    <div className="scope-v2-timeline">
      {rows.map(row=><article key={row.entry_key}>
        <button type="button" onClick={()=>openRow(row.entry_key)} aria-pressed={selectedKey===row.entry_key}>
          {TYPE_LABEL[row.entry_type]||row.entry_type}｜{row.title||row.entry_name||row.entry_key}
        </button>
        <small>{dateText(row.start_date)}{row.end_date?` 至 ${dateText(row.end_date)}`:''}</small>
      </article>)}
    </div>
    <form onSubmit={save}>
      <label><span>類型</span><select className="scope-v2-select" value={draft.entry_type} disabled={Boolean(selectedKey)} onChange={event=>change('entry_type',event.target.value)}>
        {EDITABLE_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}
      </select></label>
      <label><span>名稱</span><input className="scope-v2-search-input" value={draft.title||''} onChange={event=>change('title',event.target.value)} required/></label>
      <label><span>說明</span><textarea className="scope-v2-search-input" value={draft.summary||''} onChange={event=>change('summary',event.target.value)}/></label>
      {draft.entry_type==='anchor'?<>
        <label><span>日期</span><input className="scope-v2-select" type="date" value={dateText(draft.start_date)} onChange={event=>change('start_date',event.target.value)} required/></label>
        <label><span>定錨點識別</span><input className="scope-v2-search-input" value={draft.anchor_id||''} disabled={Boolean(selectedKey)} onChange={event=>change('anchor_id',event.target.value)} placeholder="新增時留空會自動產生"/></label>
        <label><span>註記</span><input className="scope-v2-search-input" value={draft.note||''} onChange={event=>change('note',event.target.value)}/></label>
      </>:null}
      {draft.entry_type==='event'?<div className="scope-v2-stat-controls">
        <label><span>前定錨點</span><select className="scope-v2-select" value={draft.before_id||''} onChange={event=>change('before_id',event.target.value)} required><option value="">選擇</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
        <label><span>後定錨點</span><select className="scope-v2-select" value={draft.after_id||''} onChange={event=>change('after_id',event.target.value)} required><option value="">選擇</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
      </div>:null}
      {draft.entry_type==='period'?<div className="scope-v2-stat-controls">
        <label><span>時期識別</span><input className="scope-v2-search-input" value={draft.period||''} onChange={event=>change('period',event.target.value)}/></label>
        <label><span>起始定錨點</span><select className="scope-v2-select" value={draft.start_anchor_id||''} onChange={event=>change('start_anchor_id',event.target.value)} required><option value="">選擇</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
        <label><span>結束定錨點</span><select className="scope-v2-select" value={draft.end_anchor_id||''} onChange={event=>change('end_anchor_id',event.target.value)}><option value="">目前時期</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
      </div>:null}
      {draft.entry_type==='period_style'?<div className="scope-v2-stat-controls">
        <label><span>時期風格</span><input className="scope-v2-search-input" value={draft.period_style||''} onChange={event=>change('period_style',event.target.value)} required/></label>
        <label><span>起始定錨點</span><select className="scope-v2-select" value={draft.start_anchor_id||''} onChange={event=>change('start_anchor_id',event.target.value)} required><option value="">選擇</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
        <label><span>結束定錨點</span><select className="scope-v2-select" value={draft.end_anchor_id||''} onChange={event=>change('end_anchor_id',event.target.value)}><option value="">延續至今</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
      </div>:null}
      <div className="scope-v2-stat-controls">
        <label><span>狀態</span><input className="scope-v2-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>
        {draft.entry_type==='period'?<label><span>顯示名稱</span><input className="scope-v2-search-input" value={draft.entry_name||''} onChange={event=>change('entry_name',event.target.value)}/></label>:null}
      </div>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
      <div className="scope-v2-tabs">
        <button type="submit" disabled={busy}>{busy?'儲存中…':'儲存'}</button>
        {selectedKey&&draft.entry_type==='anchor'?<button type="button" disabled={busy} onClick={removeAnchor}>刪除定錨點</button>:null}
      </div>
    </form>
  </section>;
}
