'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {
  deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows
} from '../../loc/neon-repository';

const TIME_EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['event','事件'],['period','時期']
]);
const ALL_EDITABLE_TYPES=Object.freeze([...TIME_EDITABLE_TYPES,['style','風格']]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(ALL_EDITABLE_TYPES));
const BLANK=Object.freeze({
  entry_key:'',entry_type:'anchor',title:'',summary:'',start_date:'',end_date:'',
  anchor_id:'',before_id:'',after_id:'',start_anchor_id:'',end_anchor_id:'',
  period:'',status:'',note:'',entry_name:'',style_tag:''
});

function dateText(value){return value?String(value).slice(0,10):''}
function idFor(scopeId,key){return `${scopeId}:${key}`}
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
  return {...BLANK,...row,style_tag:row.style_tag||row.entry_name||''};
}

function rowForForm(scopeId,draft,anchors){
  const payload={
    scope_id:scopeId,
    entry_key:draft.entry_key,
    entry_type:draft.entry_type,
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
  if(draft.entry_type==='anchor'){
    if(!draft.start_date)throw new Error('定錨點需要日期。');
    payload.start_date=dateText(draft.start_date);
    payload.anchor_id=String(draft.anchor_id||'').trim();
    if(!payload.anchor_id)throw new Error('定錨點識別不可空白。');
    payload.note=String(draft.note||'').trim()||null;
  }else if(draft.entry_type==='event'){
    const before=anchors.get(draft.before_id);
    const after=anchors.get(draft.after_id);
    if(!before||!after)throw new Error('事件需要選擇前後定錨點。');
    if(dateText(before.start_date)>dateText(after.start_date))throw new Error('前定錨點日期必須早於或等於後定錨點。');
    payload.before_id=before.anchor_id;
    payload.after_id=after.anchor_id;
    payload.start_date=dateText(before.start_date);
    payload.end_date=dateText(after.start_date);
    payload.event_id=draft.event_id||draft.entry_key;
  }else if(draft.entry_type==='period'){
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
  }else if(draft.entry_type==='style'){
    const start=anchors.get(draft.start_anchor_id);
    const end=draft.end_anchor_id?anchors.get(draft.end_anchor_id):null;
    const tag=String(draft.style_tag||'').trim();
    if(!tag||!start)throw new Error('風格需要標籤與起始定錨點。');
    if(draft.end_anchor_id&&!end)throw new Error('結束定錨點不存在。');
    if(end&&dateText(end.start_date)<=dateText(start.start_date))throw new Error('結束定錨點必須晚於起始定錨點。');
    payload.entry_name=tag;
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
  const [fullScopes,setFullScopes]=useState([]);
  const [dataScope,setDataScope]=useState(candidateScopes[0]||'');
  const [draft,setDraft]=useState({...BLANK});
  const [selectedKey,setSelectedKey]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [editing,setEditing]=useState(false);

  useEffect(()=>{
    onCapabilityChange?.(allowedScopes.includes('lo3rwang'));
  },[allowedScopes,dataScope,onCapabilityChange]);

  useEffect(()=>{
    let active=true;
    setAllowedScopes([]);
    setFullScopes([]);
    if(account.permissionLoading||!account.user)return()=>{active=false};
    Promise.all(candidateScopes.map(async candidate=>{
      const [global,scope,culture]=await Promise.all([
        account.canManageGlobal(),account.canManageScope(candidate),account.canManagePage(candidate,'culture')
      ]);
      return {candidate,full:Boolean(global||scope),allowed:Boolean(global||scope||culture)};
    })).then(values=>{
      if(!active)return;
      const allowed=values.filter(item=>item.allowed).map(item=>item.candidate);
      const full=values.filter(item=>item.full).map(item=>item.candidate);
      setAllowedScopes(allowed);
      setFullScopes(full);
      if(allowed.length&&!allowed.includes(dataScope))setDataScope(allowed[0]);
    }).catch(()=>{if(active){setAllowedScopes([]);setFullScopes([])}});
    return()=>{active=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal,account.canManageScope,account.canManagePage,scopeId]);

  const query=useQuery({
    queryKey:['culture-edit-data',dataScope],
    enabled:allowedScopes.includes(dataScope),
    queryFn:async()=>{
      const [{rows},styleResult]=await Promise.all([
        selectNeonRows('api.loc_timeline_entries',{
          columns:'scope_id,entry_key,entry_type,title,summary,start_date,end_date,period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,before_id,after_id,date_status,visibility,event_id,note',
          filters:[{column:'scope_id',operator:'eq',value:dataScope},{column:'entry_type',operator:'in',value:['anchor','event','period','style']}],
          orders:[{column:'start_date',ascending:true},{column:'order_no',ascending:true}],limit:1000
        }),
        dataScope==='lo3rwang'
          ?selectNeonRows('silver.lo3rwang_style',{
            columns:'style_no,node_type,representative_name,order_no',
            filters:[{column:'node_type',operator:'eq',value:'style'}],
            orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],limit:100
          })
          :selectNeonRows('silver.loc_style_tag_keywords',{
            columns:'scope_id,style_tag',
            filters:[{column:'scope_id',operator:'eq',value:dataScope}],
            orders:[{column:'style_tag',ascending:true}],limit:2000
          })
      ]);
      const styleTags=dataScope==='lo3rwang'
        ?styleResult.rows.map(row=>row.representative_name).filter(Boolean)
        :styleResult.rows.map(row=>row.style_tag).filter(Boolean);
      return {rows,styleTags:[...new Set(styleTags)]};
    },
    staleTime:20_000
  });
  const rows=query.data?.rows||[];
  const anchors=useMemo(()=>new Map(rows.filter(row=>row.entry_type==='anchor'&&row.anchor_id).map(row=>[row.anchor_id,row])),[rows]);
  const anchorOptions=useMemo(()=>[...anchors.values()].sort((a,b)=>dateText(a.start_date).localeCompare(dateText(b.start_date))),[anchors]);
  const styleTags=query.data?.styleTags||[];
  const canEditStyle=fullScopes.includes(dataScope);
  const editableTypes=canEditStyle?ALL_EDITABLE_TYPES:TIME_EDITABLE_TYPES;
  const periodRows=useMemo(()=>rows.filter(row=>row.entry_type==='period'),[rows]);
  const openRow=key=>{
    const row=rows.find(item=>item.entry_key===key);
    if(!row)return;
    if(row.entry_type==='style'&&!fullScopes.includes(dataScope)){setMessage('風格由 Scope manager 管理。');return;}
    setSelectedKey(key);
    const current=draftFrom(row);
    if(row.entry_type==='event'){
      current.before_id=row.before_id||row.start_anchor_id||'';
      current.after_id=row.after_id||row.end_anchor_id||'';
    }
    if(row.entry_type==='style')current.style_tag=row.entry_name||'';
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
    if(type==='style'&&!canEditStyle){setMessage('風格由 Scope manager 管理。');return;}
    setSelectedKey('');
    setDraft({...BLANK,entry_type:type});
    setMessage('');
  };

  useEffect(()=>{
    const commandScope=riverCommand?.scopeId||dataScope;
    if(!riverCommand?.nonce||!allowedScopes.includes(commandScope))return;
    if(riverCommand.type==='style'&&!fullScopes.includes(commandScope))return;
    setEditing(true);
    setDataScope(commandScope);
    setSelectedKey('');
    setDraft({...BLANK,entry_type:riverCommand.type||'anchor',...(riverCommand.values||{})});
    setMessage('已從 3D 河道帶入位置；確認名稱與前後定錨點後儲存。');
  },[riverCommand?.nonce,riverCommand?.scopeId,allowedScopes]);

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  const save=async event=>{
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      if(draft.entry_type==='style'&&!canEditStyle)throw new Error('風格由 Scope manager 管理。');
      const key=draft.entry_key||`${draft.entry_type}:${globalThis.crypto.randomUUID()}`;
      const values=rowForForm(dataScope,{...draft,entry_key:key,anchor_id:draft.anchor_id||key},anchors);
      if(values.entry_type==='period'){
        const candidate=effectiveRange(values,anchors);
        if(periodRows.some(row=>row.entry_key!==selectedKey&&(()=>{
          const existing=effectiveRange(row,anchors);
          return (!candidate.endExclusive||existing.start<candidate.endExclusive)&&(!existing.endExclusive||candidate.start<existing.endExclusive);
        })()))throw new Error('這段時期會與現有時期重疊。');
      }
      if(selectedKey){
        const {scope_id,entry_key,...patch}=values;
        await updateNeonRows('silver.loc_timeline_entries',patch,{filters:[
          {column:'scope_id',operator:'eq',value:dataScope},{column:'entry_key',operator:'eq',value:selectedKey}
        ]});
      }else await insertNeonRows('silver.loc_timeline_entries',[values]);
      await queryClient.invalidateQueries({queryKey:['culture-edit-data',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
      setSelectedKey(key);setMessage('已儲存。');
    }catch(error){setMessage(error?.message||'儲存失敗。')}
    finally{setBusy(false)}
  };

  const removeAnchor=async()=>{
    if(!selectedKey||draft.entry_type!=='anchor')return;
    const references=rows.filter(row=>row.entry_key!==selectedKey&&[
      row.before_id,row.after_id,row.anchor_id,row.start_anchor_id,row.end_anchor_id
    ].includes(draft.anchor_id));
    if(references.length){setMessage('此定錨點仍被事件、時期或風格使用，請先調整那些項目。');return;}
    setBusy(true);setMessage('');
    try{
      await deleteNeonRows('silver.loc_timeline_entries',{filters:[
        {column:'scope_id',operator:'eq',value:dataScope},{column:'entry_key',operator:'eq',value:selectedKey}
      ]});
      await queryClient.invalidateQueries({queryKey:['culture-edit-data',dataScope]});
      await queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]});
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
      {editableTypes.map(([type,label])=><button key={type} type="button" onClick={()=>beginAdd(type)}>新增{label}</button>)}
    </div>
    <div className="scope-v2-timeline">
      {rows.filter(row=>row.entry_type!=='period_legacy').map(row=><article key={row.entry_key}>
        <button type="button" disabled={row.entry_type==='style'&&!canEditStyle} onClick={()=>openRow(row.entry_key)} aria-pressed={selectedKey===row.entry_key}>
          {TYPE_LABEL[row.entry_type]||row.entry_type}｜{row.title||row.entry_name||row.entry_key}
        </button>
        <small>{dateText(row.start_date)}{row.end_date?` 至 ${dateText(row.end_date)}`:''}</small>
      </article>)}
    </div>
    <form onSubmit={save}>
      <label><span>類型</span><select className="scope-v2-select" value={draft.entry_type} disabled={Boolean(selectedKey)} onChange={event=>change('entry_type',event.target.value)}>
        {editableTypes.map(([type,label])=><option key={type} value={type}>{label}</option>)}
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
      {draft.entry_type==='style'?<div className="scope-v2-stat-controls">
        <label><span>風格標籤</span><select className="scope-v2-select" value={draft.style_tag||''} onChange={event=>change('style_tag',event.target.value)}><option value="">選擇</option>{styleTags.map(tag=><option key={tag} value={tag}>{tag}</option>)}</select></label>
        <label><span>起始定錨點</span><select className="scope-v2-select" value={draft.start_anchor_id||''} onChange={event=>change('start_anchor_id',event.target.value)} required><option value="">選擇</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
        <label><span>結束定錨點</span><select className="scope-v2-select" value={draft.end_anchor_id||''} onChange={event=>change('end_anchor_id',event.target.value)}><option value="">延續至今</option>{anchorOptions.map(row=><option key={row.anchor_id} value={row.anchor_id}>{dateText(row.start_date)}｜{row.title}</option>)}</select></label>
      </div>:null}
      <div className="scope-v2-stat-controls">
        <label><span>狀態</span><input className="scope-v2-search-input" value={draft.status||''} onChange={event=>change('status',event.target.value)}/></label>
        {draft.entry_type==='period'?<label><span>顯示名稱</span><input className="scope-v2-search-input" value={draft.entry_name||''} onChange={event=>change('entry_name',event.target.value)}/></label>:null}
      </div>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
      <div className="scope-v2-tabs"><button type="submit" disabled={busy}>{busy?'儲存中…':'儲存'}</button>{selectedKey&&draft.entry_type==='anchor'?<button type="button" disabled={busy} onClick={removeAnchor}>刪除定錨點</button>:null}</div>
    </form>

  </section>;
}
