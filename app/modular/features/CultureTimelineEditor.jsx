'use client';

import {DB_QUERY_BATCH_SIZE} from '../../loc/query-contract.mjs';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAccount} from '../../loc/use-account';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectRows} from '../../loc/db-query.mjs';
import {FEATURE_LOADING_MESSAGE} from '../feature-data-state';

const TIME_COLUMNS='record_id,record_type,label,resource_id,display_order,status,note,time_date,anchor_ids,date_status,year_value,visibility,style_tags,style_tag_descriptions';


const EDITABLE_TYPES=Object.freeze([
  ['anchor','定錨點'],['period','時期'],['event','事件']
]);
const TYPE_LABEL=Object.freeze(Object.fromEntries(EDITABLE_TYPES));
const BLANK=Object.freeze({
  record_id:'',record_type:'anchor',label:'',resource_id:'',note:'',time_date:'',
  anchor_ids:['0','0'],status:'',display_order:'',date_status:'exact',year_value:'',visibility:'',style_tags:'',style_tag_descriptions:{}
});

function dateText(value){return value?String(value).slice(0,10):'';}
function styleTagList(value){
  return [...new Set(String(value||'').split(/[,，]/g).map(item=>String(item||'').trim()).filter(Boolean))];
}
function styleDescriptionMap(value){
  return value&&typeof value==='object'&&!Array.isArray(value)?{...value}:{};
}
function styleDescriptionOf(value,tag){
  const source=styleDescriptionMap(value);
  if(typeof source[tag]==='string')return source[tag];
  const normalized=String(tag||'').normalize('NFKC').trim().toLocaleLowerCase('zh-Hant');
  const entry=Object.entries(source).find(([key])=>String(key||'').normalize('NFKC').trim().toLocaleLowerCase('zh-Hant')===normalized);
  return typeof entry?.[1]==='string'?entry[1]:'';
}
function normalizeAnchorIds(value){
  const source=Array.isArray(value)?value:String(value||'').split(',');
  const ids=source.map(item=>String(item||'0').trim()||'0').filter(Boolean);
  return ids.length?ids:['0','0'];
}
function rowDraft(row){
  if(!row)return {...BLANK};
  return {
    ...BLANK,...row,
    anchor_ids:normalizeAnchorIds(row.anchor_ids),
    time_date:dateText(row.time_date),
    year_value:row.year_value??'',
    style_tag_descriptions:styleDescriptionMap(row.style_tag_descriptions)
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

export default function CultureTimelineEditor({scopeId='',selectedRecordId=''}){
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
    const id=String(selectedRecordId||'').trim();
    if(!id||!rawRows.length)return;
    const row=rawRows.find(item=>String(item.record_id)===id);
    if(row){
      setSelectedId(id);
      setDraft(rowDraft(row));
      setMessage('');
    }
  },[selectedRecordId,rawRows]);

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
  const changeAnchor=(index,value)=>setDraft(current=>{
    const ids=normalizeAnchorIds(current.anchor_ids);
    return {...current,anchor_ids:ids.map((id,idIndex)=>idIndex===index?value:id)};
  });
  const addAnchor=()=>setDraft(current=>{
    const ids=normalizeAnchorIds(current.anchor_ids);
    const last=ids.at(-1)||'0';
    return {...current,anchor_ids:[...ids.slice(0,-1),'0',last]};
  });
  const removeAnchor=index=>setDraft(current=>{
    const ids=normalizeAnchorIds(current.anchor_ids);
    if(ids.length<=2)return current;
    return {...current,anchor_ids:ids.filter((_,idIndex)=>idIndex!==index)};
  });
  const changeStyleDescription=(tag,value)=>setDraft(current=>({
    ...current,
    style_tag_descriptions:{...styleDescriptionMap(current.style_tag_descriptions),[tag]:value}
  }));

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
      const activeStyleTags=type==='anchor'?[]:styleTagList(draft.style_tags);
      const styleDescriptions=Object.fromEntries(activeStyleTags.map(tag=>[
        tag,String(styleDescriptionOf(draft.style_tag_descriptions,tag)||'').trim()
      ]));
      const missingStyleDescription=activeStyleTags.find(tag=>!styleDescriptions[tag]);
      if(missingStyleDescription)throw new Error('請為風格標籤「'+missingStyleDescription+'」填寫搜尋時顯示的簡短介紹。');
      const payload={
        record_type:type,
        label,
        resource_id:resourceId,
        note:String(draft.note||'').trim()||null,
        status:String(draft.status||'').trim()||null,
        display_order:draft.display_order===''?null:Number(draft.display_order),
        visibility:String(draft.visibility||'').trim()||null,
        style_tags:activeStyleTags.length?activeStyleTags.join(','):null,
        style_tag_descriptions:styleDescriptions,
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
      }else{
        const ids=normalizeAnchorIds(draft.anchor_ids);
        if(ids.every(id=>id==='0'))throw new Error('時期／事件至少需要一個定錨點。');
        if(ids.slice(1,-1).includes('0'))throw new Error('0 只能用在第一或最後一個位置，表示開放端。');
        for(const id of ids){
          if(id!=='0'&&!anchors.has(id))throw new Error('定錨點不存在：'+id);
        }
        const dated=ids
          .filter(id=>id!=='0')
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
      setMessage('已儲存。');
    }catch(error){setMessage(error?.message||'儲存失敗。');}
    finally{setBusy(false);}
  };

  const remove=async()=>{
    if(!selectedId)return;
    if(draft.record_type==='anchor'){
      const id=String(draft.resource_id||'');
      const references=rawRows.filter(row=>row.record_type!=='anchor'&&normalizeAnchorIds(row.anchor_ids).includes(id));
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
    <p className="loc-eyebrow">登入編輯</p>
    <h2>目前時期／定錨</h2>
    <p>這個編輯器就是上方第一條時間長河的管理層。點選河道上的既有定錨、時期或事件可直接載入；新增後也會立即回到同一條河道。時期與事件使用有順序的定錨點陣列：第一個是起點、最後一個是終點，中間可加入里程碑；開放端使用 0。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    {duplicateAnchorIds.length?<p className="scope-status scope-error">同一資料區域存在重複的定錨點識別：{duplicateAnchorIds.join('、')}。請先修正，否則無法正確呈現文化資料。</p>:null}
    {query.isPending?<p className="scope-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    <div className="scope-tabs">
      {EDITABLE_TYPES.map(([type,label])=><button key={type} type="button" onClick={()=>beginAdd(type)}>新增{label}</button>)}
    </div>
    <div className="scope-timeline">
      {rows.map(row=>{
        const ids=normalizeAnchorIds(row.anchor_ids);
        const range=row.record_type==='anchor'
          ?(dateText(row.time_date)||String(row.year_value||'日期未定'))
          :ids.join(' → ');
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

      {draft.record_type!=='anchor'?<div className="scope-management-wide-field">
        <h3>定錨點序列</h3>
        <p className="scope-status">依時間順序排列；第一個與最後一個是範圍邊界，中間項目是事件／時期內的里程碑。</p>
        <div className="scope-management-fields">
          {normalizeAnchorIds(draft.anchor_ids).map((anchorId,index,ids)=><label key={index}>
            <span>{index===0?'起點':index===ids.length-1?'終點':'里程碑 '+index}</span>
            <select className="scope-select" value={anchorId} onChange={event=>changeAnchor(index,event.target.value)}>
              {(index===0||index===ids.length-1)
                ?<option value="0">0｜開放端</option>
                :<option value="0" disabled>請選擇里程碑</option>}
              {anchorOptions.map(row=><option key={row.resource_id} value={row.resource_id}>{dateText(row.time_date)||row.year_value||'未知'}｜{row.label}</option>)}
            </select>
            {ids.length>2&&index>0&&index<ids.length-1?<button type="button" onClick={()=>removeAnchor(index)}>移除此里程碑</button>:null}
          </label>)}
        </div>
        <button type="button" onClick={addAnchor}>新增里程碑</button>
      </div>:null}

      {draft.record_type!=='anchor'?<>
        <label className="scope-management-wide-field"><span>風格標籤</span><input className="scope-search-input" value={draft.style_tags||''} onChange={event=>change('style_tags',event.target.value)} placeholder="以逗號分隔；時間長河與搜尋共用"/></label>
        {styleTagList(draft.style_tags).length?<div className="scope-management-wide-field">
          <h3>風格關鍵詞說明</h3>
          <p className="scope-status">搜尋精確命中風格詞時，先顯示這段簡短介紹，再列出相關搜尋結果。</p>
          <div className="scope-management-fields">
            {styleTagList(draft.style_tags).map(tag=><label key={tag}><span>{tag}</span><textarea className="scope-search-input" value={styleDescriptionOf(draft.style_tag_descriptions,tag)} onChange={event=>changeStyleDescription(tag,event.target.value)} placeholder={'搜尋「'+tag+'」時顯示的簡短介紹'}/></label>)}
          </div>
        </div>:null}
      </>:null}

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
