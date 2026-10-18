'use client';

import {useUiCopy,useUiLocale} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';

import {useMemo,useState} from 'react';
import {insertRows,dbAuthRelation,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {IMPORT_FIELD_ALIASES,importRowsFromJson,mappedImportValue,validImportBatchSize,writeImportBatches} from './import-batch.mjs';
import {UNIVERSAL_IMPORT_ACCEPT,parseUniversalImportFile} from './universal-file-import.mjs';
import {ARCHIVE_MAX_BYTES,detectZipArchiveSource} from './private-archive-universal.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText,resolveGalaxyTitle} from './content-policy';
import {refreshSunoStyleMetaTags} from './suno-style-meta-tags.mjs';
import ArticleBodyEditor from './ArticleBodyEditor';
import {blocksToPlainText,plainTextToBlocks} from './blocknote-content.mjs';

const ZIP_LAYOUT_KEYS=Object.freeze({
  'conversation-tree':'conversationTree','message-list':'messageList','post-list':'postList',
  activity:'activity',media:'media',table:'table','structured-records':'records',document:'document'
});
const ZIP_FIELD_KEYS=Object.freeze(['id','text','author','time','relation','attachment','collection']);
const ZIP_SOURCE_NAMES=Object.freeze({chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',grok:'Grok',copilot:'Microsoft Copilot',perplexity:'Perplexity', 'meta-ai':'Meta AI',facebook:'Facebook',messenger:'Messenger',instagram:'Instagram',threads:'Threads',whatsapp:'WhatsApp',x:'X / Twitter',telegram:'Telegram',discord:'Discord',line:'LINE',slack:'Slack',teams:'Microsoft Teams',snapchat:'Snapchat',wechat:'WeChat',tiktok:'TikTok',reddit:'Reddit',linkedin:'LinkedIn',pinterest:'Pinterest',youtube:'YouTube','google-takeout':'Google Takeout'});
function sourceSuggestion(name=''){
  const value=String(name).toLowerCase();
  for(const key of ['threads','facebook','pixnet','ptt','vocus','instagram']){
    if(value.includes(key))return key;
  }
  return String(name).replace(/\.[a-z0-9]+$/i,'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'import';
}
function iso(value){
  if(!value)return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}

function normalizeJsonImportEntry(entry,source,fieldMap={},t){
  const row=entry?.raw||entry||{};
  const value=field=>mappedImportValue(row,field,fieldMap);
  const content=normalizeGalaxyContent(value('content'));
  const rawTitle=repairMojibakeText(value('title')).trim();
  const sourcePlace=repairMojibakeText(value('source_place')).trim();
  const uid=String(value('uid')||entry?.import_uid||createUid8()).trim().toUpperCase();
  if(!content)return {record:null,error:t('uiExtra.importUI.invalidNoBody')};
  if([content,rawTitle,sourcePlace].some(hasIrrecoverableEncoding))return {record:null,error:t('uiExtra.importUI.invalidEncoding')};
  if(uid.length!==8)return {record:null,error:t('uiExtra.importUI.invalidUid')};
  const visibility=value('searchable');
  const searchable=!(visibility===false||visibility===0||String(visibility).toLowerCase()==='false'||String(visibility)==='0');
  const record={
    uid,
    title:resolveGalaxyTitle(rawTitle,content),
    content,
    createtime:iso(value('createtime')),
    source_native_id:String(value('source_native_id')||'').trim()||null,
    source_place:sourcePlace||null,
    searchable,
    statistics_able:value('statistics_able')===false||String(value('statistics_able')).toLowerCase()==='false'||!searchable?false:!isPureUrlContent(content),
    source_id:String(value('source_id')||'').trim()||null,
    target_id:normalizeRelationIds(value('target_id')),
    ref_id:String(value('ref_id')||'').trim()||null,
    url:String(value('url')||'').trim()||null,
    source_name:String(source||'').trim()
  };
  return {record,error:''};
}

const IMPORT_FORMAT_FIELDS=Object.freeze([
  'uid','content','title','createtime','source_native_id','source_place',
  'url','source_id','target_id','ref_id','searchable','statistics_able'
]);

function ImportFormatSettings({format,onChange,disabled=false}){
  const t=useUiText();
  const update=(key,value)=>onChange({...format,[key]:value});
  const updateField=(key,value)=>onChange({...format,fields:{...format.fields,[key]:value}});
  return <details className="scope-inline-card scope-import-format">
    <summary><UiText id="uiExtra.importUI.formatSummary"/></summary>
    <div className="scope-management-fields">
      <label><UiText id="uiExtra.importUI.recordPath"/>
        <input disabled={disabled} value={format.recordPath} onChange={e=>update('recordPath',e.target.value)} placeholder={t('uiExtra.importUI.recordPathHint')}/>
      </label>
      <label><UiText id="uiExtra.importUI.batchSize"/>
        <select disabled={disabled} value={format.batchSize} onChange={e=>update('batchSize',Number(e.target.value))}>
          {[25,50,100,200].map(size=><option key={size} value={size}>{t('uiExtra.importUI.itemsPerBatch',{count:size})}</option>)}
        </select>
      </label>
    </div>
    <div className="scope-management-fields">
      {IMPORT_FORMAT_FIELDS.map(key=><label key={key}>{t('uiExtra.importUI.field.'+key)}
        <input disabled={disabled} value={format.fields[key]||''}
          onChange={e=>updateField(key,e.target.value)}
          placeholder={IMPORT_FIELD_ALIASES[key].join(', ')}/>
      </label>)}
    </div>
  </details>;
}

function UniversalImport({scopeId,format,onBusyChange}) {
  const {locale}=useUiLocale();
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const account=useAccount();
  const [fileName,setFileName]=useState('');
  const [archiveDetection,setArchiveDetection]=useState(null);
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
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields,t));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      invalid:normalized.filter(item=>!item.record)
    };
  },[rows,source,format.fields,locale]);
  if(!account.canManageScopeSync(scopeId))return null;

  async function loadQueuedFile(file,index,total){
    setFileName(file.name);setRows([]);setArchiveDetection(null);setProgress(null);setStatus('');
    if(file.size>ARCHIVE_MAX_BYTES){
      setStatus('檔案超過 512 MiB 安全上限，未讀取或解析。');
      return;
    }
    const firstBytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
    const isZip=/\.zip$/i.test(file.name)||(firstBytes[0]===80&&firstBytes[1]===75&&[3,5,7].includes(firstBytes[2]));
    if(isZip){setBusy(true);setStatus(t('uiExtra.importUI.zipInspecting'));}
    try{
      if(isZip){
        const result=await detectZipArchiveSource(file);
        setArchiveDetection(result);
        setSource(result.sources.length===1?result.sources[0]:'');
        setStatus(t('uiExtra.importUI.zipInspected',{count:result.filesSeen}));
        return;
      }
      const list=await parseUniversalImportFile(file,{recordPath:format.recordPath});
      const prepared=list.map(row=>({
        raw:row,
        import_uid:createUid8()
      }));
      setRows(prepared);
      setSource(sourceSuggestion(file.name));
      setStatus(t('uiExtra.importUI.parsedFile',{index:index+1,total,count:list.length.toLocaleString()}));
    }catch(error){
      setRows([]);
      setStatus(t('uiExtra.importUI.parseFileFailed',{index:index+1,error:error?.message||error}));
    }finally{
      if(isZip)setBusy(false);
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
    if(!selected){setStatus(t('uiExtra.importUI.selectSource'));return;}
    if(!analyzed.valid.length){setStatus(t('uiExtra.importUI.noValidItems'));return;}
    setBusy(true);onBusyChange?.(true);setStatus(t('uiExtra.importUI.checkingUids'));
    setProgress({completed:0,total:analyzed.valid.length,percent:0});
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
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
        if(error)throw new Error(error.message||t('uiExtra.importUI.existingUidFailed'));
        for(const row of data||[])existing.add(String(row.uid||'').toUpperCase());
      }
      const nativeIds=[...seenNative];
      for(let offset=0;offset<nativeIds.length;offset+=200){
        const ids=nativeIds.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxy)
          .select('source_native_id')
          .eq('source_name',selected)
          .in('source_native_id',ids);
        if(error)throw new Error(error.message||t('uiExtra.importUI.existingNativeFailed'));
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
      setStatus(t('uiExtra.importUI.importComplete',{index:queueIndex+1,total:queue.length,count:payload.length.toLocaleString(),skipped:skipped?t('uiExtra.importUI.skippedClause',{count:skipped.toLocaleString()}):'',next:t(queueIndex+1<queue.length?'uiExtra.importUI.nextFileGuide':'uiExtra.importUI.finishedAll')}));
      setRows([]);
    }catch(error){
      setStatus(String(error?.message||error||t('uiExtra.importUI.importFailed'))+t('uiExtra.importUI.importRetry'));
    }finally{setBusy(false);onBusyChange?.(false);}
  }
  const pending=queue.length>queueIndex+1;
  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.importJson}</h4>
    <label>{UI_COPY.management.currentFile}<input type="file" accept={UNIVERSAL_IMPORT_ACCEPT} multiple disabled={busy} onChange={chooseFile}/></label>
    {fileName?<p><UiText id="uiExtra.importUI.fileLabel"/><strong>{fileName}</strong><UiText id="uiExtra.importUI.fileQueue" params={{index:queueIndex+1,total:queue.length}}/><strong>{archiveDetection?(archiveDetection.sources.map(kind=>ZIP_SOURCE_NAMES[kind]||kind).join(' / ')||t('uiExtra.importUI.zipUnknown')):suggested}</strong></p>:null}
    <label>{UI_COPY.management.sourceChoice}<input disabled={busy||!rows.length} value={source} onChange={event=>setSource(event.target.value)} placeholder={suggested}/></label>
    {archiveDetection?<section className="scope-import-preview" aria-label={t('uiExtra.importUI.zipDetected')}>
      <p><strong>{t('uiExtra.importUI.zipDetected')}：</strong>{archiveDetection.sources.map(kind=>ZIP_SOURCE_NAMES[kind]||kind).join(' / ')||t('uiExtra.importUI.zipUnknown')}</p>
      <p>{t('uiExtra.importUI.zipConfidence')}：{t(archiveDetection.confidence===3?'uiExtra.importUI.zipVerified':archiveDetection.confidence?'uiExtra.importUI.zipPossible':'uiExtra.importUI.zipUnknown')}</p>
      {archiveDetection.evidence.length?<p>{t('uiExtra.importUI.zipEvidence')}：{archiveDetection.evidence.map(item=>item.path).join('、')}</p>:null}
      <p>{t('uiExtra.importUI.zipStructureCount',{count:archiveDetection.structure?.sampledFiles||0})}</p>
      {Object.keys(archiveDetection.structure?.layouts||{}).length?<p>
        {t('uiExtra.importUI.zipLayouts')}：
        {Object.entries(archiveDetection.structure.layouts).map(([kind,count])=>
          t('uiExtra.importUI.zipLayout.'+(ZIP_LAYOUT_KEYS[kind]||'records'))+' '+count).join('、')}
      </p>:null}
      {Object.keys(archiveDetection.structure?.formats||{}).length?<p>
        {t('uiExtra.importUI.zipFormats')}：
        {Object.entries(archiveDetection.structure.formats).map(([kind,count])=>kind.toUpperCase()+' '+count).join('、')}
      </p>:null}
      {ZIP_FIELD_KEYS.some(key=>archiveDetection.structure?.fields?.[key])?<p>
        {t('uiExtra.importUI.zipFields')}：
        {ZIP_FIELD_KEYS.filter(key=>archiveDetection.structure?.fields?.[key]).map(key=>
          t('uiExtra.importUI.zipField.'+key)).join('、')}
      </p>:null}
      {archiveDetection.audit?<div className="scope-import-audit">
        <p><strong>{t('uiExtra.importUI.zipAuditTitle')}</strong></p>
        <p>{t('uiExtra.importUI.zipAuditFiles',{
          total:archiveDetection.audit.files.allFiles,
          sampled:archiveDetection.audit.files.sampled,
          remaining:archiveDetection.audit.files.notInspected,
          partial:archiveDetection.audit.files.partialSamples
        })}</p>
        <p>{t('uiExtra.importUI.zipAuditAssets',{count:archiveDetection.audit.files.assets})}</p>
        <p>{t('uiExtra.importUI.zipAuditProjects',{
          files:archiveDetection.audit.projects.possibleProjectFiles,
          linked:archiveDetection.audit.projects.additionalFilesWithProjectFields,
          refs:archiveDetection.audit.projects.sampleReferences.length
        })}</p>
        {archiveDetection.audit.projects.observedFields.length?<p>
          {t('uiExtra.importUI.zipProjectFields')}：{archiveDetection.audit.projects.observedFields.join('、')}
        </p>:null}
        {archiveDetection.audit.attention.length?<details>
          <summary>{t('uiExtra.importUI.zipUninspected')}</summary>
          <ul>{archiveDetection.audit.attention.slice(0,10).map((item,i)=>
            <li key={i}>{item.path} — {t('uiExtra.importUI.zipAuditReason.'+item.reason)}</li>)}</ul>
        </details>:null}
        <p>{t('uiExtra.importUI.zipAuditCaveat')}</p>
      </div>:null}
      <p>{t('uiExtra.importUI.zipReadOnly')}</p>
    </section>:null}
    {rows.length?<section className="scope-import-preview" aria-label={t('uiExtra.importUI.preview')}>
      <p className="scope-status"><UiText id="uiExtra.importUI.validSkipped" params={{valid:analyzed.valid.length.toLocaleString(),skipped:analyzed.invalid.length.toLocaleString()}}/></p>
      <div className="scope-management-records">
        {analyzed.valid.slice(0,5).map(record=><article className="scope-inline-card" key={record.uid}>
          <strong>{record.title||record.uid}</strong>
          <span>{record.uid} · {String(record.createtime||'').slice(0,10)||t('uiExtra.importUI.noDate')}</span>
          <p>{String(record.content||'').slice(0,180)}{String(record.content||'').length>180?'…':''}</p>
        </article>)}
      </div>
      {analyzed.invalid.length?<p className="scope-status"><UiText id="uiExtra.importUI.skippedReasons"/>{analyzed.invalid.slice(0,5).map(item=>item.error).join('、')}</p>:null}
    </section>:null}
    {progress?<div role="status" className="scope-import-progress">
      <progress value={progress.percent||0} max="100"/>
      <p><UiText id="uiExtra.importUI.writtenProgress" params={{completed:Number(progress.completed||0).toLocaleString(),total:Number(progress.total||0).toLocaleString(),percent:progress.percent||0}}/></p>
    </div>:null}
    <div className="scope-tabs">
      <button type="button" disabled={busy||!analyzed.valid.length} onClick={run}>{busy?UI_COPY.management.importing:t('uiExtra.importUI.batchImport')}</button>
      {pending&&!rows.length?<button type="button" disabled={busy} onClick={nextFile}><UiText id="uiExtra.importUI.nextJson"/></button>:null}
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
  const t=useUiText();
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
      setStatus(t('uiExtra.importUI.refreshLoaded',{count:list.length.toLocaleString()}));
    }catch(error){
      setRows([]);setPlan(null);setStatus(t('uiExtra.importUI.refreshParseFailed',{error:error?.message||error}));
    }
  }

  async function analyze(){
    const selected=source.trim();
    if(!selected){setStatus(t('uiExtra.importUI.selectSource'));return;}
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields,t));
    const valid=normalized.filter(item=>item.record&&item.record.source_native_id).map(item=>item.record);
    const invalid=normalized.length-valid.length;
    if(!valid.length){setPlan({creates:[],updates:[],unchanged:[],invalid});setStatus(t('uiExtra.importUI.noNativeId'));return;}
    setBusy(true);onBusyChange?.(true);setStatus(t('uiExtra.importUI.analyzing'));setProgress(null);
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const existing=[];
      const ids=[...new Set(valid.map(row=>String(row.source_native_id||'').trim()).filter(Boolean))];
      for(let offset=0;offset<ids.length;offset+=200){
        const batch=ids.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxy)
          .select('uid,title,content,createtime,source_native_id,source_place,url,searchable,statistics_able,source_name')
          .eq('source_name',selected)
          .in('source_native_id',batch);
        if(error)throw new Error(error.message||t('uiExtra.importUI.refreshCompareFailed'));
        existing.push(...(data||[]));
      }
      const byNative=new Map(existing.map(row=>[String(row.source_native_id||'').trim(),row]));
      const hasExplicit=(item,field)=>{
        const value=mappedImportValue(item.raw,field,format.fields);
        return value!==undefined&&value!==null&&String(value).trim()!=='';
      };
      const explicitNativeIds=field=>new Set(rows.filter(item=>hasExplicit(item,field))
        .map(item=>String(mappedImportValue(item.raw,'source_native_id',format.fields)||'').trim()).filter(Boolean));
      const explicitVisibilityIds=explicitNativeIds('searchable');
      const explicitStatisticsIds=explicitNativeIds('statistics_able');
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
          searchable:explicitVisibilityIds.has(nativeId)?record.searchable:current.searchable,
          statistics_able:explicitStatisticsIds.has(nativeId)?record.statistics_able:current.statistics_able,
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
      setStatus(t('uiExtra.importUI.diffComplete',{created:creates.length.toLocaleString(),updated:updates.length.toLocaleString(),unchanged:unchanged.length.toLocaleString(),skipped:nextPlan.invalid.toLocaleString()}));
    }catch(error){setPlan(null);setStatus(error?.message||t('uiExtra.importUI.refreshAnalyzeFailed'));}
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
      if(!galaxy)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
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
      setStatus(t('uiExtra.importUI.refreshComplete',{created:plan.creates.length.toLocaleString(),updated:plan.updates.length.toLocaleString()}));
      setPlan(null);setRows([]);setFileName('');
    }catch(error){
      setPlan(null);
      setStatus(String(error?.message||error||t('uiExtra.importUI.refreshWriteFailed'))+t('uiExtra.importUI.refreshRetry'));
    }finally{setBusy(false);onBusyChange?.(false);}
  }

  return <div className="scope-inline-card">
    <h4>Source Refresh</h4>
    <p><UiText id="uiExtra.importUI.refreshHelp"/></p>
    <label>Refresh JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={chooseFile}/></label>
    {fileName?<p><UiText id="uiExtra.importUI.fileLabel"/><strong>{fileName}</strong></p>:null}
    <label><UiText id="uiExtra.importUI.sourceLabel"/><input disabled={busy} value={source} onChange={event=>{setSource(event.target.value);setPlan(null);setProgress(null);}} placeholder={sourceSuggestion(fileName)}/></label>
    <div className="scope-tabs">
      <button type="button" disabled={busy||!rows.length} onClick={analyze}>{busy?t('uiExtra.importUI.processing'):t('uiExtra.importUI.analyze')}</button>
      <button type="button" disabled={busy||!plan||(!plan.creates.length&&!plan.updates.length)} onClick={applyRefresh}><UiText id="uiExtra.importUI.applyRefresh"/></button>
    </div>
    {plan?<div className="scope-ranking">
      <div><strong><UiText id="uiExtra.importUI.create"/></strong><span>{plan.creates.length.toLocaleString()}</span></div>
      <div><strong><UiText id="uiExtra.importUI.update"/></strong><span>{plan.updates.length.toLocaleString()}</span></div>
      <div><strong><UiText id="uiExtra.importUI.unchanged"/></strong><span>{plan.unchanged.length.toLocaleString()}</span></div>
      <div><strong><UiText id="uiExtra.importUI.skipped"/></strong><span>{plan.invalid.toLocaleString()}</span></div>
    </div>:null}
    {progress?<div role="status" className="scope-import-progress">
      <progress value={progress.percent||0} max="100"/>
      <p><UiText id="uiExtra.importUI.writtenProgress" params={{completed:Number(progress.completed||0).toLocaleString(),total:Number(progress.total||0).toLocaleString(),percent:progress.percent||0}}/></p>
    </div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </div>;
}

function MediaRecordInsert({scopeId}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
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
      if(galaxyLink&&galaxyLink.length!==8)throw new Error(t('uiExtra.importUI.linkUidInvalid'));
      const mediaType=repairMojibakeText(draft.media_type).trim();
      if(!mediaType)throw new Error(t('uiExtra.importUI.mediaTypeRequired'));
      const metaTags=repairMojibakeText(draft.meta_tags).trim();
      const mediaTitle=repairMojibakeText(draft.title).trim();
      const sourcePlace=repairMojibakeText(draft.source_place).trim();
      if([mediaType,metaTags,mediaTitle,sourcePlace].some(hasIrrecoverableEncoding))throw new Error(t('uiExtra.importUI.mediaEncoding'));
      if(!metaTags)throw new Error(t('uiExtra.importUI.tagsRequired'));
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
      if(!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      await insertRows(galaxyMedia,[record]);
      setStatus(t('uiExtra.importUI.mediaSaved'));
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
    }catch(error){setStatus(error?.message||t('uiExtra.importUI.mediaSaveFailed'));}
    finally{setBusy(false);}
  }

  return <div className="scope-inline-card">
    <h4>{UI_COPY.management.addMedia}</h4>
    <p><UiText id="uiExtra.importUI.mediaHelp"/></p>
    <form onSubmit={save} className="scope-editor">
      <div className="scope-stat-controls">
        <label>media_type<input value={draft.media_type} onChange={e=>change('media_type',e.target.value)} placeholder="ig_pic / facebook_pic / suno / video / url" required/></label>
        <label>galaxy_link<input value={draft.galaxy_link} onChange={e=>change('galaxy_link',e.target.value)} placeholder={t('uiExtra.importUI.mediaUidHint')}/></label>
        <label>createtime<input type="datetime-local" value={draft.createtime} onChange={e=>change('createtime',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <label>source_native_id<input value={draft.source_native_id} onChange={e=>change('source_native_id',e.target.value)}/></label>
        <label>source_place<input value={draft.source_place} onChange={e=>change('source_place',e.target.value)} placeholder={t('uiExtra.importUI.placeHint')}/></label>
      </div>
      <label><UiText id="uiExtra.importUI.mediaTitle"/><input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>url<input value={draft.url} onChange={e=>change('url',e.target.value)} placeholder={t('uiExtra.importUI.externalUrlHint')}/></label>
      <label>meta_tags<input value={draft.meta_tags} onChange={e=>change('meta_tags',e.target.value)} placeholder={t('uiExtra.importUI.tagHint')} required/></label>
      <button type="submit" disabled={busy}>{busy?UI_COPY.common.saving:UI_COPY.management.addMedia}</button>
      {status?<p className="scope-status">{status}</p>:null}
    </form>
  </div>;
}

function SunoImport({scopeId}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const account=useAccount();
  const freshSunoDraft=()=>({title:'',lyrics:'',lyricsBlocks:plainTextToBlocks(''),stylePrompt:'',stylePromptBlocks:plainTextToBlocks(''),stylePromptPlain:'',editorKey:createUid8(),url:'',nativeId:'',createdDate:'',metaTags:'',metaTagsEdited:false,source_id:'',target_id:'',ref_id:''});
  const [draft,setDraft]=useState(freshSunoDraft);
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;
  const change=(key,value)=>setDraft(current=>({
    ...current,[key]:value,
    ...(key==='stylePromptPlain'&&!current.metaTagsEdited?{metaTags:refreshSunoStyleMetaTags(value,current.metaTags)}:{}),
    ...(key==='metaTags'?{metaTagsEdited:true}:{})
  }));
  function regenerateStyleTags(){
    setDraft(current=>({...current,metaTags:refreshSunoStyleMetaTags(current.stylePromptPlain,current.metaTags),metaTagsEdited:false}));
  }
  function detectId(url){
    const match=String(url||'').match(/\/song\/([0-9a-f-]{20,})/i);return match?.[1]||'';
  }
  async function save(event){
    event.preventDefault();setBusy(true);setStatus('');
    try{
      const title=repairMojibakeText(draft.title).trim();
      const lyrics=normalizeGalaxyContent(draft.lyrics||blocksToPlainText(draft.lyricsBlocks));
      const stylePrompt=normalizeGalaxyContent(draft.stylePrompt||blocksToPlainText(draft.stylePromptBlocks));
      const metaTags=repairMojibakeText(draft.metaTags).trim();
      if([title,lyrics,stylePrompt,metaTags].some(hasIrrecoverableEncoding))throw new Error(t('uiExtra.importUI.sunoEncoding'));
      if(!title)throw new Error(t('uiExtra.importUI.sunoTitleRequired'));
      if(!metaTags)throw new Error(t('uiExtra.importUI.sunoTagsRequired'));
      const createtime=draft.createdDate?new Date(draft.createdDate+'T00:00:00+08:00').toISOString():new Date().toISOString();
      const lyricsUid=lyrics?createUid8():null;
      const styleUid=lyricsUid&&stylePrompt?createUid8():null;
      const sourceId=draft.source_id.trim()||(styleUid?draft.ref_id.trim():'')||null;
      const scopeData=account.scopeDataFor(scopeId);
      if(!scopeData)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const {galaxy,galaxyMedia}=scopeData;
      if(lyricsUid){
        await insertRows(galaxy,[{
          uid:lyricsUid,
          title,content:lyrics,createtime,
          source_id:sourceId,target_id:normalizeRelationIds(draft.target_id),ref_id:styleUid||draft.ref_id.trim()||null,
          url:draft.url.trim()||null,searchable:true,source_name:'suno'
        }]);
      }
      if(styleUid){
        await insertRows(galaxy,[{
          uid:styleUid,
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
      setStatus(t('uiExtra.importUI.sunoSaved'));setDraft(freshSunoDraft());
    }catch(error){setStatus(error?.message||t('uiExtra.importUI.sunoSaveFailed'));}
    finally{setBusy(false);}
  }
  return <div className="scope-inline-card">
    <h4><UiText id="uiExtra.importUI.sunoImport"/></h4>
    <form onSubmit={save} className="scope-editor">
      <label>{UI_COPY.management.songTitle}<input value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <div className="scope-management-wide-field"><span>{UI_COPY.management.lyrics}</span>
        <ArticleBodyEditor editorKey={'suno-lyrics:'+draft.editorKey} content={draft.lyricsBlocks}
          onBlocksChange={blocks=>setDraft(current=>current.editorKey===draft.editorKey
            ?{...current,lyricsBlocks:blocks}:current)}
          onHtmlChange={html=>setDraft(current=>current.editorKey===draft.editorKey
            ?{...current,lyrics:html}:current)}/>
      </div>
      <div className="scope-stat-controls">
        <label>Suno URL<input value={draft.url} onChange={e=>change('url',e.target.value)}/></label>
        <label>Suno ID<input value={draft.nativeId} onChange={e=>change('nativeId',e.target.value)} placeholder={t('uiExtra.importUI.sunoIdHint')}/></label>
        <label><UiText id="common.date"/><input type="date" value={draft.createdDate} onChange={e=>change('createdDate',e.target.value)}/></label>
      </div>
      <div className="scope-stat-controls">
        <div className="scope-management-wide-field"><span>Suno Style</span>
          <ArticleBodyEditor editorKey={'suno-style:'+draft.editorKey} content={draft.stylePromptBlocks}
            onBlocksChange={blocks=>setDraft(current=>current.editorKey!==draft.editorKey?current:{
              ...current,stylePromptBlocks:blocks,
              stylePromptPlain:blocksToPlainText(blocks),
              ...(!current.metaTagsEdited?{metaTags:refreshSunoStyleMetaTags(blocksToPlainText(blocks),current.metaTags)}:{})
            })}
            onHtmlChange={html=>setDraft(current=>current.editorKey===draft.editorKey
              ?{...current,stylePrompt:html}:current)}/>
        </div>
        <label>Meta Tags<input value={draft.metaTags} onChange={e=>change('metaTags',e.target.value)} placeholder={t('uiExtra.importUI.sunoStyleTagHint')} required/></label>
        <button type="button" className="loc-button" onClick={regenerateStyleTags}><UiText id="uiExtra.importUI.sunoRegenerate"/></button>
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
    <h2><UiText id="uiExtra.importUI.importTitle"/></h2>
    <ImportFormatSettings format={format} onChange={changeFormat} disabled={busyCount>0}/>
    <UniversalImport key={'file-'+revision} scopeId={scopeId} format={format} onBusyChange={setBusy}/>
    <SourceRefresh key={'refresh-'+revision} scopeId={scopeId} format={format} onBusyChange={setBusy}/>
    <MediaRecordInsert scopeId={scopeId}/>
    <SunoImport scopeId={scopeId}/>
  </section>;
}
