'use client';

import {UI_COPY} from '../i18n/ui-copy';

import {useMemo,useState} from 'react';
import {insertRows,dbAuthRelation,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {IMPORT_FIELD_ALIASES,importRowsFromJson,mappedImportValue,validImportBatchSize,writeImportBatches} from './import-batch.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText,resolveGalaxyTitle} from './content-policy';

function sourceSuggestion(name=''){
  const value=String(name).toLowerCase();
  for(const key of ['threads','facebook','pixnet','ptt','vocus','instagram']){
    if(value.includes(key))return key;
  }
  return String(name).replace(/\.json$/i,'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'import';
}
function iso(value){
  if(!value)return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}

function normalizeJsonImportEntry(entry,source,fieldMap={}){
  const row=entry?.raw||entry||{};
  const value=field=>mappedImportValue(row,field,fieldMap);
  const content=normalizeGalaxyContent(value('content'));
  const rawTitle=repairMojibakeText(value('title')).trim();
  const sourcePlace=repairMojibakeText(value('source_place')).trim();
  const uid=String(value('uid')||entry?.import_uid||createUid8()).trim().toUpperCase();
  if(!content)return {record:null,error:'無正文'};
  if([content,rawTitle,sourcePlace].some(hasIrrecoverableEncoding))return {record:null,error:'文字含不可逆編碼錯誤'};
  if(uid.length!==8)return {record:null,error:'UID 必須為 8 字'};
  const contentType=String(value('content_type')||'other').trim()||'other';
  const visibility=value('searchable');
  const searchable=!(visibility===false||visibility===0||String(visibility).toLowerCase()==='false'||String(visibility)==='0');
  const record={
    uid,
    content_type:contentType,
    title:resolveGalaxyTitle(rawTitle,content),
    content,
    createtime:iso(value('createtime')),
    source_native_id:String(value('source_native_id')||'').trim()||null,
    source_place:sourcePlace||null,
    searchable,
    statistics_able:contentType!=='instruction'&&!isPureUrlContent(content),
    source_id:String(value('source_id')||'').trim()||null,
    target_id:normalizeRelationIds(value('target_id')),
    ref_id:String(value('ref_id')||'').trim()||null,
    url:String(value('url')||'').trim()||null,
    source_name:String(source||'').trim()
  };
  return {record,error:''};
}

const IMPORT_FORMAT_FIELDS=Object.freeze([
  ['uid','UID'],['content','正文'],['title','標題'],['createtime','日期時間'],
  ['source_native_id','平台原生 ID'],['content_type','內容類型'],['source_place','地點'],
  ['url','外部 URL'],['source_id','來源關聯'],['target_id','目標關聯'],
  ['ref_id','參照關聯'],['searchable','公開搜尋']
]);

function ImportFormatSettings({format,onChange,disabled=false}){
  const update=(key,value)=>onChange({...format,[key]:value});
  const updateField=(key,value)=>onChange({...format,fields:{...format.fields,[key]:value}});
  return <details className="scope-inline-card scope-import-format">
    <summary>匯入格式設定（共用於 JSON Import／Source Refresh）</summary>
    <p className="scope-status">先設定格式再選檔。欄位留空即使用既有名稱自動對應；可輸入單一欄位名稱、巢狀路徑（如 post.body），或逗號分隔的候選名稱。修改格式後，本次檔案預覽需重新選擇。</p>
    <div className="scope-management-fields">
      <label>資料陣列路徑（預設支援根陣列／items／posts／data／records）
        <input disabled={disabled} value={format.recordPath} onChange={e=>update('recordPath',e.target.value)} placeholder="例如 result.entries；留空自動辨識"/>
      </label>
      <label>每批寫入筆數
        <select disabled={disabled} value={format.batchSize} onChange={e=>update('batchSize',Number(e.target.value))}>
          {[25,50,100,200].map(size=><option key={size} value={size}>{size} 筆／批</option>)}
        </select>
      </label>
    </div>
    <div className="scope-management-fields">
      {IMPORT_FORMAT_FIELDS.map(([key,label])=><label key={key}>{label}
        <input disabled={disabled} value={format.fields[key]||''}
          onChange={e=>updateField(key,e.target.value)}
          placeholder={IMPORT_FIELD_ALIASES[key].join(', ')}/>
      </label>)}
    </div>
  </details>;
}

function JsonImport({scopeId,format,onBusyChange}) {
  const account=useAccount();
  const [fileName,setFileName]=useState('');
  const [rows,setRows]=useState([]);
  const [queue,setQueue]=useState([]);
  const [queueIndex,setQueueIndex]=useState(0);
  const [source,setSource]=useState('');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const suggested=useMemo(()=>sourceSuggestion(fileName),[fileName]);
  const analyzed=useMemo(()=>{
    const selected=source.trim();
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      invalid:normalized.filter(item=>!item.record)
    };
  },[rows,source,format.fields]);
  if(!account.canManageScopeSync(scopeId))return null;

  async function loadQueuedFile(file,index,total){
    setFileName(file.name);setRows([]);setProgress(null);setStatus('');
    try{
      const parsed=JSON.parse(await file.text());
      const list=importRowsFromJson(parsed,format.recordPath);
      const prepared=list.map(row=>({
        raw:row,
        import_uid:createUid8()
      }));
      setRows(prepared);
      setSource(sourceSuggestion(file.name));
      setStatus('第 '+(index+1)+'／'+total+' 檔已解析 '+list.length.toLocaleString()+' 筆；請檢查來源與預覽後再寫入。');
    }catch(error){
      setRows([]);
      setStatus('第 '+(index+1)+' 檔 JSON／格式解析失敗：'+(error?.message||error));
    }
  }
  async function chooseFile(event){
    if(busy)return;
    const files=Array.from(event.target.files||[]);
    if(!files.length)return;
    setQueue(files);setQueueIndex(0);
    await loadQueuedFile(files[0],0,files.length);
  }
  async function nextFile(){
    const next=queueIndex+1;
    if(busy||next>=queue.length)return;
    setQueueIndex(next);
    await loadQueuedFile(queue[next],next,queue.length);
  }
  async function run(){
    if(busy||!rows.length)return;
    const selected=source.trim();
    if(!selected){setStatus('請先指定來源。');return;}
    if(!analyzed.valid.length){setStatus('沒有可匯入的有效資料。');return;}
    setBusy(true);onBusyChange?.(true);setStatus('核對現有 UID…');
    setProgress({completed:0,total:analyzed.valid.length,percent:0});
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');
      const unique=[],seenUid=new Set(),seenNative=new Set();
      let duplicateCount=0;
      for(const record of analyzed.valid){
        const nativeId=String(record.source_native_id||'').trim();
        if(seenUid.has(record.uid)||(nativeId&&seenNative.has(nativeId))){duplicateCount++;continue;}
        seenUid.add(record.uid);
        if(nativeId)seenNative.add(nativeId);
        unique.push(record);
      }
      const existing=new Set();
      const existingNative=new Set();
      for(let offset=0;offset<unique.length;offset+=200){
        const ids=unique.slice(offset,offset+200).map(record=>record.uid);
        const {data,error}=await dbAuthRelation(galaxy).select('uid').in('uid',ids);
        if(error)throw new Error(error.message||'既有 UID 檢查失敗。');
        for(const row of data||[])existing.add(String(row.uid||'').toUpperCase());
      }
      const nativeIds=[...seenNative];
      for(let offset=0;offset<nativeIds.length;offset+=200){
        const ids=nativeIds.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxy)
          .select('source_native_id')
          .eq('source_name',selected)
          .in('source_native_id',ids);
        if(error)throw new Error(error.message||'來源原生 ID 檢查失敗。');
        for(const row of data||[])existingNative.add(String(row.source_native_id||'').trim());
      }
      const payload=unique.filter(record=>!existing.has(record.uid)&&!(record.source_native_id&&existingNative.has(record.source_native_id)));
      const existingCount=unique.length-payload.length;
      setProgress({completed:0,total:payload.length,percent:payload.length?0:100});
      await writeImportBatches(payload,{
        batchSize:validImportBatchSize(format.batchSize),
        writeBatch:batch=>insertRows(galaxy,batch),
        onProgress:progress=>setProgress(progress)
      });
      const skipped=analyzed.invalid.length+duplicateCount+existingCount;
      setStatus('第 '+(queueIndex+1)+'／'+queue.length+' 檔完成：新增 '+payload.length.toLocaleString()+' 筆'+(skipped?'；略過 '+skipped.toLocaleString()+' 筆（無效／重複／已存在）':'')+'。'+(queueIndex+1<queue.length?'請選擇下一檔繼續。':'本次檔案全部處理完成。'));
      setRows([]);
    }catch(error){
      setStatus(String(error?.message||error||'匯入失敗。')+' 可保留本檔並重新執行；系統會重新核對已存在 UID。');
    }finally{setBusy(false);onBusyChange?.(false);}
  }
  const pending=queue.length>queueIndex+1;
  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.importJson}</h4>
    <label>{UI_COPY.management.currentFile}<input type="file" accept=".json,application/json" multiple disabled={busy} onChange={chooseFile}/></label>
    {fileName?<p>檔案：<strong>{fileName}</strong>（第 {queueIndex+1}／{queue.length} 檔）｜建議來源：<strong>{suggested}</strong></p>:null}
    <label>{UI_COPY.management.sourceChoice}<input disabled={busy||!rows.length} value={source} onChange={event=>setSource(event.target.value)} placeholder={suggested}/></label>
    <p className="loc-subtitle">每次只讀取與確認一個 JSON 檔案；檔內資料依設定筆數分批寫入 Galaxy，不會一次送出全部有效資料。相同 UID 或「來源＋平台原生 ID」會略過。沒有這兩種穩定識別的紀錄，重新選檔不保證可辨識重複資料。</p>
    {rows.length?<section className="scope-import-preview" aria-label="JSON 匯入預覽">
      <p className="scope-status">有效 {analyzed.valid.length.toLocaleString()} 筆｜略過 {analyzed.invalid.length.toLocaleString()} 筆</p>
      <div className="scope-management-records">
        {analyzed.valid.slice(0,5).map(record=><article className="scope-inline-card" key={record.uid}>
          <strong>{record.title||record.uid}</strong>
          <span>{record.uid} · {record.content_type} · {String(record.createtime||'').slice(0,10)||'無日期'}</span>
          <p>{String(record.content||'').slice(0,180)}{String(record.content||'').length>180?'…':''}</p>
        </article>)}
      </div>
      {analyzed.invalid.length?<p className="scope-status">前幾筆略過原因：{analyzed.invalid.slice(0,5).map(item=>item.error).join('、')}</p>:null}
    </section>:null}
    {progress?<div role="status" className="scope-import-progress">
      <progress value={progress.percent||0} max="100"/>
      <p>已確認寫入 {Number(progress.completed||0).toLocaleString()}／{Number(progress.total||0).toLocaleString()} 筆 · {progress.percent||0}%</p>
    </div>:null}
    <div className="scope-tabs">
      <button type="button" disabled={busy||!analyzed.valid.length} onClick={run}>{busy?UI_COPY.management.importing:'分批匯入目前檔案'}</button>
      {pending&&!rows.length?<button type="button" disabled={busy} onClick={nextFile}>下一個 JSON 檔案</button>:null}
    </div>
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </div>;
}

function refreshComparable(record={}){
  return {
    title:String(record.title||''),
    content:String(record.content||''),
    createtime:String(record.createtime||''),
    source_place:String(record.source_place||''),
    url:String(record.url||''),
    searchable:record.searchable!==false,
    statistics_able:record.statistics_able!==false
  };
}

function sameRefreshRecord(current,next){
  const a=refreshComparable(current),b=refreshComparable(next);
  return Object.keys(a).every(key=>a[key]===b[key]);
}

function SourceRefresh({scopeId,format,onBusyChange}){
  const account=useAccount();
  const [fileName,setFileName]=useState('');
  const [rows,setRows]=useState([]);
  const [source,setSource]=useState('');
  const [plan,setPlan]=useState(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  if(!account.canManageScopeSync(scopeId))return null;

  async function chooseFile(event){
    const file=event.target.files?.[0];
    if(!file||busy)return;
    setFileName(file.name);setRows([]);setStatus('');setPlan(null);setProgress(null);
    try{
      const parsed=JSON.parse(await file.text());
      const list=importRowsFromJson(parsed,format.recordPath);
      setRows(list.map(row=>({raw:row,import_uid:createUid8()})));
      setSource(sourceSuggestion(file.name));
      setStatus('已載入 '+list.length.toLocaleString()+' 筆 Refresh payload；先分析差異，不會直接寫入。');
    }catch(error){
      setRows([]);setPlan(null);setStatus('Refresh JSON／格式解析失敗：'+(error?.message||error));
    }
  }

  async function analyze(){
    const selected=source.trim();
    if(!selected){setStatus('請先指定來源。');return;}
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields));
    const valid=normalized.filter(item=>item.record&&item.record.source_native_id).map(item=>item.record);
    const invalid=normalized.length-valid.length;
    if(!valid.length){setPlan({creates:[],updates:[],unchanged:[],invalid});setStatus('沒有帶 source_native_id 的有效資料。');return;}
    setBusy(true);onBusyChange?.(true);setStatus('分析差異中…');setProgress(null);
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');
      const existing=[];
      const ids=[...new Set(valid.map(row=>String(row.source_native_id||'').trim()).filter(Boolean))];
      for(let offset=0;offset<ids.length;offset+=200){
        const batch=ids.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxy)
          .select('uid,title,content,createtime,source_native_id,source_place,url,searchable,statistics_able,source_name')
          .eq('source_name',selected)
          .in('source_native_id',batch);
        if(error)throw new Error(error.message||'Source Refresh 既有資料比對失敗。');
        existing.push(...(data||[]));
      }
      const byNative=new Map(existing.map(row=>[String(row.source_native_id||'').trim(),row]));
      const creates=[],updates=[],unchanged=[],seen=new Set();
      for(const record of valid){
        const nativeId=String(record.source_native_id||'').trim();
        if(!nativeId||seen.has(nativeId))continue;
        seen.add(nativeId);
        const current=byNative.get(nativeId);
        if(!current){creates.push(record);continue;}
        const next={
          ...record,
          uid:current.uid,
          source_name:selected,
          createtime:record.createtime||current.createtime||null,
          source_place:record.source_place||current.source_place||null,
          url:record.url||current.url||null
        };
        if(sameRefreshRecord(current,next))unchanged.push(next);
        else updates.push(next);
      }
      const nextPlan={creates,updates,unchanged,invalid:invalid+(valid.length-seen.size)};
      setPlan(nextPlan);
      setStatus('差異完成：新增 '+creates.length.toLocaleString()+'、更新 '+updates.length.toLocaleString()+'、不變 '+unchanged.length.toLocaleString()+'、略過 '+nextPlan.invalid.toLocaleString()+'。');
    }catch(error){setPlan(null);setStatus(error?.message||'Source Refresh 分析失敗。');}
    finally{setBusy(false);onBusyChange?.(false);}
  }

  async function applyRefresh(){
    if(!plan||busy)return;
    const selected=source.trim();
    setBusy(true);onBusyChange?.(true);setStatus('');
    const total=plan.creates.length+plan.updates.length;
    let completed=0;
    setProgress({completed:0,total,percent:total?0:100});
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error('Scope data 未解析');
      await writeImportBatches(plan.creates,{
        batchSize:validImportBatchSize(format.batchSize),
        writeBatch:batch=>insertRows(galaxy,batch),
        onProgress:p=>{
          completed=p.completed;
          setProgress({completed,total,percent:Math.round(completed/Math.max(1,total)*100)});
        }
      });
      for(const row of plan.updates){
        await updateRows(galaxy,{
          title:row.title,
          content:row.content,
          createtime:row.createtime,
          source_place:row.source_place,
          url:row.url,
          searchable:row.searchable!==false,
          statistics_able:row.statistics_able!==false,
          UpdateTime:new Date().toISOString()
        },{filters:[{column:'uid',operator:'eq',value:row.uid}]});
        completed++;
        if(completed%10===0||completed===total)setProgress({completed,total,percent:Math.round(completed/Math.max(1,total)*100)});
      }
      setStatus('Source Refresh 完成：新增 '+plan.creates.length.toLocaleString()+'、更新 '+plan.updates.length.toLocaleString()+'；不變資料未重寫。');
      setPlan(null);setRows([]);setFileName('');
    }catch(error){
      setPlan(null);
      setStatus(String(error?.message||error||'Source Refresh 寫入失敗。')+'。可能已有部分批次成功，請重新「分析差異」後再套用，避免重複寫入。');
    }finally{setBusy(false);onBusyChange?.(false);}
  }

  return <div className="scope-inline-card">
    <h4>Source Refresh</h4>
    <p>以 source_name + source_native_id 進行增量更新；沿用上方格式設定，先查本檔資料涉及的來源 ID。先預覽差異，再逐批新增、逐筆更新。若中途失敗，必須重新分析差異。</p>
    <label>Refresh JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={chooseFile}/></label>
    {fileName?<p>檔案：<strong>{fileName}</strong></p>:null}
    <label>來源<input disabled={busy} value={source} onChange={event=>{setSource(event.target.value);setPlan(null);setProgress(null);}} placeholder={sourceSuggestion(fileName)}/></label>
    <div className="scope-tabs">
      <button type="button" disabled={busy||!rows.length} onClick={analyze}>{busy?'處理中…':'分析差異'}</button>
      <button type="button" disabled={busy||!plan||(!plan.creates.length&&!plan.updates.length)} onClick={applyRefresh}>分批套用 Refresh</button>
    </div>
    {plan?<div className="scope-ranking">
      <div><strong>新增</strong><span>{plan.creates.length.toLocaleString()}</span></div>
      <div><strong>更新</strong><span>{plan.updates.length.toLocaleString()}</span></div>
      <div><strong>不變</strong><span>{plan.unchanged.length.toLocaleString()}</span></div>
      <div><strong>略過</strong><span>{plan.invalid.toLocaleString()}</span></div>
    </div>:null}
    {progress?<div role="status" className="scope-import-progress">
      <progress value={progress.percent||0} max="100"/>
      <p>已確認寫入 {Number(progress.completed||0).toLocaleString()}／{Number(progress.total||0).toLocaleString()} 筆 · {progress.percent||0}%</p>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </div>;
}

function MediaRecordInsert({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState({
    galaxy_link:'',
    source_native_id:'',
    source_place:'',
    media_type:'',
    title:'',
    url:'',
    meta_tags:'',
    createtime:''
  });
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setBusy(true);setStatus('');
    try{
      const galaxyLink=String(draft.galaxy_link||'').trim().toUpperCase();
      if(galaxyLink&&galaxyLink.length!==8)throw new Error('galaxy_link 必須是 8 字 UID，或留空。');
      const mediaType=repairMojibakeText(draft.media_type).trim();
      if(!mediaType)throw new Error('media_type 為必填欄位。');
      const metaTags=repairMojibakeText(draft.meta_tags).trim();
      const mediaTitle=repairMojibakeText(draft.title).trim();
      const sourcePlace=repairMojibakeText(draft.source_place).trim();
      if([mediaType,metaTags,mediaTitle,sourcePlace].some(hasIrrecoverableEncoding))throw new Error('多媒體文字 metadata 含不可逆編碼錯誤。');
      if(!metaTags)throw new Error('meta_tags 必須在建立多媒體紀錄時由資料提供者設定；LOC 不會自動分類。');
      const record={
        galaxy_link:galaxyLink||null,
        source_native_id:String(draft.source_native_id||'').trim()||null,
        source_place:sourcePlace||null,
        media_type:mediaType,
        title:mediaTitle||null,
        url:String(draft.url||'').trim()||null,
        meta_tags:metaTags,
        createtime:iso(draft.createtime)
      };
      const galaxyMedia=account.scopeDataFor(scopeId)?.galaxyMedia;
      if(!galaxyMedia)throw new Error('Scope data 未解析');
      await insertRows(galaxyMedia,[record]);
      setStatus('多媒體資料已直接寫入 Galaxy Media。');
      setDraft({
        galaxy_link:'',
        source_native_id:'',
        source_place:'',
        media_type:'',
        title:'',
        url:'',
        meta_tags:'',
        createtime:''
      });
    }catch(error){setStatus(error?.message||'多媒體儲存失敗。');}
    finally{setBusy(false);}
  }

  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.addMedia}</h4>
    <p>只記錄外部媒體參照與文字 metadata：URL／雲端連結、檔名或標題、來源 ID、時間、地點與 Meta Tag；不接收、不暫存任何圖片／音訊／影片檔案。media_id 由資料庫自動產生，url 可留空。</p>
    <form onSubmit={save} className="scope-editor">
      <div className="scope-stat-controls">
        <label>media_type<input value={draft.media_type} onChange={e=>change('media_type',e.target.value)} placeholder="ig_pic / facebook_pic / suno / video / url" required/></label>
        <label>galaxy_link<input value={draft.galaxy_link} onChange={e=>change('galaxy_link',e.target.value)} placeholder="8 字 UID，可留空"/></label>
        <label>createtime<input type="datetime-local" value={draft.createtime} onChange={e=>change('createtime',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label>source_native_id<input value={draft.source_native_id} onChange={e=>change('source_native_id',e.target.value)}/></label>
        <label>source_place<input value={draft.source_place} onChange={e=>change('source_place',e.target.value)} placeholder="打卡地點／拍攝位置"/></label>
      </div>
      <label>title／檔名<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>url<input value={draft.url} onChange={e=>change('url',e.target.value)} placeholder="外部 URL／雲端連結，可留空，之後再補"/></label>
      <label>meta_tags<input value={draft.meta_tags} onChange={e=>change('meta_tags',e.target.value)} placeholder="建立時由資料提供者設定，逗號分隔" required/></label>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addMedia}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

function SunoImport({scopeId}){
  const account=useAccount();
  const [draft,setDraft]=useState({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  function detectId(url){
    const match=String(url||'').match(/\/song\/([0-9a-f-]{20,})/i);return match?.[1]||'';
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      const title=repairMojibakeText(draft.title).trim();
      const lyrics=normalizeGalaxyContent(draft.lyrics);
      const stylePrompt=normalizeGalaxyContent(draft.stylePrompt);
      const metaTags=repairMojibakeText(draft.metaTags).trim();
      if([title,lyrics,stylePrompt,metaTags].some(hasIrrecoverableEncoding))throw new Error('Suno 文字資料含不可逆編碼錯誤。');
      if(!title)throw new Error('請填寫歌名。');
      if(!metaTags)throw new Error('Media Meta Tags 必須在建立時提供；LOC 不會自動分類。');
      const createtime=draft.createdDate?new Date(draft.createdDate+'T00:00:00+08:00').toISOString():new Date().toISOString();
      const lyricsUid=lyrics?createUid8():null;
      const styleUid=lyricsUid&&stylePrompt?createUid8():null;
      const sourceId=draft.source_id.trim()||(styleUid?draft.ref_id.trim():'')||null;
      const scopeData=account.scopeDataFor(scopeId);
      if(!scopeData)throw new Error('Scope data 未解析');
      const {galaxy,galaxyMedia}=scopeData;
      if(lyricsUid){
        await insertRows(galaxy,[{
          uid:lyricsUid,content_type:'lyrics',
          title,content:lyrics,createtime,
          source_id:sourceId,target_id:normalizeRelationIds(draft.target_id),ref_id:styleUid||draft.ref_id.trim()||null,
          url:draft.url.trim()||null,searchable:true,source_name:'suno'
        }]);
      }
      if(styleUid){
        await insertRows(galaxy,[{
          uid:styleUid,content_type:'instruction',
          title:title+'｜Suno Style',content:stylePrompt,createtime,
          target_id:[lyricsUid],searchable:false,statistics_able:false,source_name:'suno'
        }]);
      }
      await insertRows(galaxyMedia,[{
        galaxy_link:lyricsUid,
        source_native_id:draft.nativeId.trim()||detectId(draft.url)||null,media_type:'suno',
        title,url:draft.url.trim()||null,
        meta_tags:metaTags||null,createtime
      }]);
      setStatus('Suno 單筆資料已儲存。');setDraft({title:'',lyrics:'',url:'',nativeId:'',createdDate:'',stylePrompt:'',metaTags:'',source_id:'',target_id:'',ref_id:''});
    }catch(error){setStatus(error?.message||'Suno 儲存失敗。');}
    finally{setBusy(false);}
  }
  return <div className="scope-inline-card">
    <h4>Suno 單筆匯入</h4>
    <p>Suno 無批次匯出時使用。歌詞與 Suno Style 進 Galaxy；媒體連結與 Meta Tag 進 Galaxy Media。</p>
    <form onSubmit={save} className="scope-editor">
      <label>{UI_COPY.management.songTitle}<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>{UI_COPY.management.lyrics}<textarea rows={8} value={draft.lyrics} onChange={e=>change('lyrics',e.target.value)}/></label>
      <div className="scope-stat-controls">
        <label>Suno URL<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label>Suno ID<input value={draft.nativeId} onChange={e=>change('nativeId',e.target.value)} placeholder="可由 URL 自動辨識"/></label>
        <label>日期<input type="date" value={draft.createdDate} onChange={e=>change('createdDate',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label>Suno Style<input value={draft.stylePrompt} onChange={e=>change('stylePrompt',e.target.value)}/></label>
        <label>Meta Tags<input value={draft.metaTags} onChange={e=>change('metaTags',e.target.value)} placeholder="建立時由資料提供者設定" required/></label>
      </div>
      <div className="scope-stat-controls">
        <label>source_id<input value={draft.source_id} onChange={e=>change('source_id',e.target.value)}/></label>
        <label>target_id<input value={draft.target_id} onChange={e=>change('target_id',e.target.value)}/></label>
        <label>ref_id<input value={draft.ref_id} onChange={e=>change('ref_id',e.target.value)}/></label>
      </div>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addSuno}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

export default function ManagementImportPanel({scopeId}){
  const [format,setFormat]=useState({recordPath:'',batchSize:100,fields:{}});
  const [revision,setRevision]=useState(0);
  const [busyCount,setBusyCount]=useState(0);
  const setBusy=flag=>setBusyCount(value=>Math.max(0,value+(flag?1:-1)));
  function changeFormat(next){
    if(busyCount)return;
    setFormat(next);
    setRevision(value=>value+1);
  }
  return <section className="scope-inline-card scope-management-imports">
    <h2>資料匯入</h2>
    <p>Import 是進階資料操作：先選擇共用 JSON 格式，再逐檔預覽、按批寫入並核對筆數。Scope 與 Admin 是唯一兩種管理 role；匯入不是第三種權限。</p>
    <ImportFormatSettings format={format} onChange={changeFormat} disabled={busyCount>0}/>
    <JsonImport key={'json-'+revision} scopeId={scopeId} format={format} onBusyChange={setBusy}/>
    <SourceRefresh key={'refresh-'+revision} scopeId={scopeId} format={format} onBusyChange={setBusy}/>
    <MediaRecordInsert scopeId={scopeId}/>
    <SunoImport scopeId={scopeId}/>
  </section>;
}
