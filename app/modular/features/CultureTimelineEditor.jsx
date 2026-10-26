'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import {useAsyncResource,useResourceCache} from '../../loc/use-async-resource';
import {useEditDock} from '../edit-dock';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {revalidateServerMetadata} from '../../loc/scope-data';
import {DB_QUERY_BATCH_SIZE,selectRows} from '../../loc/db-query.mjs';
import {decodeTimeSegments,encodeTimeSegment,resolveTimeSegments,isTimeUid} from '../../loc/time-anchor-ranges.mjs';

const TIME_COLUMNS='uid,type,title,description,time_date,anchor_ids,status';
const TYPES=['anchor','time_period','time_trace'];
const normalizeType=value=>({period:'time_trace',event:'time_period'}[value]||value);
const displayType={anchor:'定錨點',time_period:'事件',time_trace:'時期／時間痕跡'};
const blank=(type='anchor')=>({uid:'',type:normalizeType(type),title:'',description:'',time_date:'',anchor_ids:[],status:''});
const day=value=>value?String(value).slice(0,10):'';
function nextTimeUid(rows){
  const taken=new Set(rows.map(row=>String(row.uid||'')));
  for(let i=1;i<=65535;i++){
    const candidate=i.toString(16).toUpperCase().padStart(4,'0');
    if(!taken.has(candidate))return candidate;
  }
  throw new Error('本 Scope 的四碼時間 UID 已用盡');
}
function normalizeDraft(row){
  if(!row)return blank();
  return {...blank(row.type),...row,time_date:day(row.time_date),
    anchor_ids:Array.isArray(row.anchor_ids)?row.anchor_ids:[]};
}
export default function CultureTimelineEditor({
  scopeId='',timeTable:providedTimeTable='',selectedRecordId='',suggestedAnchorDate='',
  suggestedRecordType='anchor',suggestedRequestNonce=0,defaultRecordType='anchor',onClose=null
}){
  useUiSection('uiExtra.dataErrors');
  const copy=useUiCopy();
  const editDock=useEditDock();
  const resourceCache=useResourceCache();
  const searchParams=useSearchParams();
  const routeAnchorDate=String(searchParams?.get?.('anchorDate')||'').slice(0,10);
  const effectiveAnchorDate=day(suggestedAnchorDate||(!selectedRecordId?routeAnchorDate:''));
  const dataScope=String(scopeId||'').trim();
  const timeTable=String(providedTimeTable||'').trim();
  const editable=Boolean(dataScope&&dataScope!=='loc'&&timeTable);
  const defaultType=TYPES.includes(normalizeType(defaultRecordType))?normalizeType(defaultRecordType):'anchor';
  const [draft,setDraft]=useState(()=>blank(defaultType));
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const original=useRef(blank(defaultType));
  const requestSeen=useRef('');
  const dockActions=useRef({save:null,isDirty:()=>false,isBusy:()=>false});
  const editorRef=useRef(null),inputRef=useRef(null);

  const query=useAsyncResource({
    queryKey:['culture-period-settings',dataScope,timeTable],
    enabled:editable,
    queryFn:async()=>{
      const {rows}=await selectRows(timeTable,{
        columns:TIME_COLUMNS,filters:[{column:'type',operator:'in',value:TYPES}],
        orders:[{column:'uid',ascending:true}],limit:DB_QUERY_BATCH_SIZE,offset:0
      });
      return rows;
    }
  });
  const all=query.data||[];
  const anchors=useMemo(()=>new Map(all.filter(row=>row.type==='anchor').map(row=>[String(row.uid),row])),[all]);
  const eventChoices=useMemo(()=>[...all].filter(row=>row.type==='time_period'),[all]);
  const eventByUid=useMemo(()=>new Map(eventChoices.map(row=>[String(row.uid),row])),[eventChoices]);
  const anchorChoices=useMemo(()=>[...anchors.values()]
    .sort((a,b)=>day(a.time_date).localeCompare(day(b.time_date))||
      String(a.uid).localeCompare(String(b.uid))),[anchors]);
  const rows=useMemo(()=>[...all].sort((a,b)=>{
    const position=row=>{
      if(row.type==='anchor')return day(row.time_date);
      const eventRanges=eventChoices.map(event=>({...event,ranges:resolveTimeSegments(event.anchor_ids,anchors,{period:false})}));
      return row.type==='time_trace'
        ?(row.anchor_ids||[]).flatMap(id=>eventRanges.find(event=>event.uid===id)?.ranges||[])
          .map(range=>range.start_date).filter(Boolean).sort()[0]||'9999-12-31'
        :resolveTimeSegments(row.anchor_ids,anchors,{period:false})
          .map(range=>range.start_date).filter(Boolean).sort()[0]||'9999-12-31';
    };
    return position(a).localeCompare(position(b))||
      String(a.uid).localeCompare(String(b.uid));
  }),[all,anchors,eventChoices]);
  const selectRow=id=>{
    const row=all.find(item=>String(item.uid)===String(id));
    if(!row)return;
    setSelectedId(String(id));
    const next=normalizeDraft(row);
    original.current=next;setDraft(next);setMessage('');
  };
  useEffect(()=>{
    const id=String(selectedRecordId||'').trim();
    if(!id||!all.length)return;
    if(id===selectedId&&dockActions.current.isDirty())return;
    const row=all.find(item=>String(item.uid)===id);
    if(row){
      const next=normalizeDraft(row);
      setSelectedId(id);original.current=next;setDraft(next);setMessage('');
    }
  },[selectedRecordId,all,selectedId]);
  useEffect(()=>{
    const preferred=normalizeType(suggestedRecordType);
    const type=TYPES.includes(preferred)?preferred:'anchor';
    if(selectedRecordId||(!effectiveAnchorDate&&!suggestedRequestNonce))return;
    const key=[suggestedRequestNonce,effectiveAnchorDate,type].join(':');
    if(requestSeen.current===key)return;
    requestSeen.current=key;
    const fresh={...blank(type),time_date:type==='anchor'?effectiveAnchorDate:''};
    setDraft(fresh);original.current=fresh;setSelectedId('');setMessage('');
  },[suggestedRecordType,suggestedRequestNonce,effectiveAnchorDate,selectedRecordId]);
  useEffect(()=>{
    if(!editable||(!selectedRecordId&&!suggestedRequestNonce))return;
    editorRef.current?.scrollIntoView({block:'nearest'});
    inputRef.current?.focus({preventScroll:true});
  },[editable,selectedRecordId,suggestedRequestNonce]);
  useEffect(()=>{
    if(!editDock?.active||editDock.scopeId!==scopeId)return undefined;
    return editDock.register({
      save:options=>dockActions.current.save(options),
      isDirty:()=>dockActions.current.isDirty(),
      isBusy:()=>dockActions.current.isBusy()
    });
  },[editDock?.active,editDock?.scopeId,editDock?.register,scopeId]);
  if(!editable)return null;

  const reset=()=>{
    const fresh=blank(defaultType);
    original.current=fresh;setDraft(fresh);setSelectedId('');setMessage('');onClose?.();
  };
  const change=(key,value)=>setDraft(row=>({...row,[key]:value}));
  const segments=decodeTimeSegments(draft.anchor_ids);
  const setSegments=next=>change('anchor_ids',next.map(range=>encodeTimeSegment(range.start,range.end)));
  const updateSegment=(index,key,value)=>{
    const copy=segments.map(row=>({...row}));
    copy[index][key]=value;
    if(copy[index].end===copy[index].start)copy[index].end='';
    if(!copy[index].start)return;
    setSegments(copy);
  };
  const addSegment=()=>{
    const choices=draft.type==='time_trace'?eventChoices:anchorChoices;
    if(!choices.length)return;
    setSegments([...segments,{start:String(choices[0].uid),end:''}]);
  };
  const refresh=async()=>{
    if(dataScope!=='local')await revalidateServerMetadata();
    await Promise.all([
      resourceCache.invalidate({queryKey:['culture-timeline',scopeId]}),
      resourceCache.invalidate({queryKey:['culture-period-settings',dataScope]}),
      resourceCache.invalidate({queryKey:['culture-time-periods',scopeId]}),
      resourceCache.invalidate({queryKey:['culture-period-roots','v2',scopeId]}),
      resourceCache.invalidate({queryKey:['culture-period-source-snapshot','v6',scopeId]})
    ]);
  };
  const save=async(event)=>{
    event.preventDefault?.();
    if(busy||query.isPending)return false;
    setBusy(true);setMessage('');
    try{
      const title=String(draft.title||'').trim();
      if(!title)throw new Error('請輸入名稱');
      const type=String(draft.type||'');
      if(!TYPES.includes(type))throw new Error('不支援的時間紀錄類型');
      const payload={type,title,description:String(draft.description||'').trim()||null,
        time_date:null,anchor_ids:null};
      if(type==='anchor'){
        const timeDate=day(draft.time_date);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(timeDate))throw new Error('請先指定有效的定錨日期');
        payload.time_date=timeDate;
      }else{
        if(draft.type==='time_period'&&!anchorChoices.length)throw new Error('請先建立時間定錨點');
        if(draft.type==='time_trace'&&!eventChoices.length)throw new Error('請先建立事件');
        if(!segments.length)throw new Error('請加入至少一個已存在的時間定錨點');
        const unchangedLinks=Boolean(selectedId)&&
          JSON.stringify(draft.anchor_ids)===JSON.stringify(original.current.anchor_ids);
        for(const segment of segments){
          const source=draft.type==='time_trace'?eventByUid:anchors;
          if(!isTimeUid(segment.start)||!source.has(segment.start)&&!unchangedLinks)
            throw new Error('找不到引用的定錨點或事件：'+segment.start);
          if(draft.type==='time_trace'){
            if(segment.end)throw new Error('時間痕跡只列事件 UID，不另外寫日期。');
            continue;
          }
          if(segment.end&&segment.end!=='0'&&!anchors.has(segment.end)&&!unchangedLinks)
            throw new Error('找不到結束定錨點：'+segment.end);
          if(segment.end&&segment.end!=='0'&&anchors.has(segment.start)&&anchors.has(segment.end)&&
            day(anchors.get(segment.end)?.time_date)<=day(anchors.get(segment.start)?.time_date))
            throw new Error('結束定錨點必須晚於起始定錨點');
        }
        payload.anchor_ids=draft.type==='time_trace'
          ?segments.map(segment=>segment.start)
          :segments.map(segment=>encodeTimeSegment(segment.start,segment.end));
      }
      if(selectedId){
        await updateRows(timeTable,payload,{filters:[{column:'uid',operator:'eq',value:selectedId}]});
      }else{
        await insertRows(timeTable,[{uid:nextTimeUid(all),...payload}]);
      }
      await refresh();reset();setMessage('已儲存。');return true;
    }catch(error){setMessage(error?.message||'儲存失敗');editDock?.setNotice?.(error?.message||'儲存失敗');return false;}
    finally{setBusy(false);}
  };
  const remove=async()=>{
    if(!selectedId||busy)return;
    setBusy(true);setMessage('');
    try{
      // Periods survive anchor deletion; only their affected UID links become invalid.
      await deleteRows(timeTable,{filters:[{column:'uid',operator:'eq',value:selectedId}]});
      await refresh();reset();setMessage('已刪除。');
    }catch(error){setMessage(error?.message||'刪除失敗');}
    finally{setBusy(false);}
  };
  dockActions.current={save:()=>save({preventDefault(){}}),
    isDirty:()=>JSON.stringify(draft)!==JSON.stringify(original.current),
    isBusy:()=>busy};
  return <section ref={editorRef} className="scope-culture-inline-editor" role="region" aria-label="時間定錨與時期編輯">
    <header className="scope-culture-inline-heading">
      <h4>{selectedId?'編輯':'新增'}{displayType[draft.type]}</h4>
    </header>
    {query.error?<p className="scope-status scope-error" role="alert">{query.error.message}</p>:null}
    {rows.length?<label>現有時間紀錄（含失效連線，可重新選擇定錨點）
      <select className="scope-select" value={selectedId} onChange={event=>{
        if(event.target.value)selectRow(event.target.value);
        else reset();
      }}>
        <option value="">新增紀錄</option>
        {rows.map(row=><option key={row.uid} value={row.uid}>
          {displayType[row.type]}｜{row.title}
        </option>)}
      </select>
    </label>:null}
    {query.isPending?<p className="scope-status" role="status">{copy.uiExtra.dataErrors.loading}</p>:null}
    <form className="scope-culture-quick-form" onSubmit={save}>
      {!selectedId?<label>種類
        <select className="scope-select" value={draft.type} onChange={e=>setDraft(blank(e.target.value))}>
          {TYPES.map(type=><option key={type} value={type}>{displayType[type]}</option>)}
        </select>
      </label>:null}
      <div className="scope-culture-quick-primary">
        <label className="scope-culture-quick-name">名稱
          <input ref={inputRef} className="scope-search-input" value={draft.title} required
            onChange={event=>change('title',event.target.value)}/>
        </label>
        {draft.type==='anchor'?<label>定錨日期
          <input className="scope-select" type="date" required value={day(draft.time_date)}
            onChange={event=>change('time_date',event.target.value)}/>
        </label>:null}
      </div>
      {draft.type!=='anchor'?<div className="scope-culture-quick-anchors">
        {draft.type==='time_trace'&&!eventChoices.length
          ?<p className="scope-status scope-error">請先建立事件，才能新增時期。</p>
          :draft.type==='time_period'&&!anchorChoices.length
            ?<p className="scope-status scope-error">請先建立時間定錨點，才能新增事件。</p>:null}
        {segments.map((segment,index)=><div key={index} className="scope-culture-quick-primary">
          <label>{draft.type==='time_trace'?'第 '+(index+1)+' 個事件':'第 '+(index+1)+' 段起點'}
            <select className="scope-select" value={segment.start}
              onChange={e=>updateSegment(index,'start',e.target.value)}>
              {!(draft.type==='time_trace'?eventByUid:anchors).has(segment.start)?
                <option value={segment.start}>已失效：{segment.start}</option>:null}
              {(draft.type==='time_trace'?eventChoices:anchorChoices)
                .map(row=><option key={row.uid} value={row.uid}>
                  {draft.type==='time_trace'?'事件｜':day(row.time_date)+'｜'}{row.title}
                </option>)}
            </select>
          </label>
          {draft.type==='time_period'?<label>結束（可只有單一定錨點）
            <select className="scope-select" value={segment.end}
              onChange={e=>updateSegment(index,'end',e.target.value)}>
              <option value="">單一定錨點</option>
              <option value="0">開放至今</option>
              {segment.end&&segment.end!=='0'&&!anchors.has(segment.end)?
                <option value={segment.end}>已失效：{segment.end}</option>:null}
              {anchorChoices.filter(row=>row.uid!==segment.start)
                .map(row=><option key={row.uid} value={row.uid}>{day(row.time_date)}｜{row.title}</option>)}
            </select>
          </label>:null}
          <button type="button" className="loc-button"
            onClick={()=>setSegments(segments.filter((_,i)=>i!==index))}>移除</button>
        </div>)}
        <button type="button" className="loc-button"
          disabled={draft.type==='time_trace'?!eventChoices.length:!anchorChoices.length}
          onClick={addSegment}>{draft.type==='time_trace'?'＋ 加入事件':'＋ 新增定錨點／時間區間'}</button>
        {segments.some(seg=>draft.type==='time_trace'
          ?!eventByUid.has(seg.start)
          :resolveTimeSegments([seg.raw],anchors).some(r=>r.invalid))?
          <p className="scope-status scope-error">部分定錨點連線已失效，請修正對應區間。</p>:null}
      </div>:null}
      <label className="scope-culture-quick-notes">說明
        <textarea className="scope-search-input" rows={3} value={draft.description||''}
          onChange={event=>change('description',event.target.value)}/>
      </label>
      {message?<p className="scope-status" role="status" aria-live="polite">{message}</p>:null}
      <div className="scope-culture-quick-actions">
        <button type="submit" className="loc-button" disabled={busy||query.isPending||Boolean(query.error)}>
          {busy?'儲存中…':selectedId?'儲存修改':'儲存'}
        </button>
        <button type="button" className="loc-button" onClick={reset} disabled={busy}>取消</button>
        {selectedId?<button type="button" className="loc-button" onClick={remove} disabled={busy}>刪除</button>:null}
      </div>
    </form>
  </section>;
}
