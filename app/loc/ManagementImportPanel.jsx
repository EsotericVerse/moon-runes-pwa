'use client';

import {useUiCopy,useUiLocale,useUiSection} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection} from '../i18n/ui-copy';
import managementZh from '../i18n/sections/management.zh_tw.js';
import importUIZh from '../i18n/sections/uiExtra.importUI.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.importUI',importUIZh);

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {insertRows,dbAuthRelation,updateRows,deleteRows,findGalaxyDuplicates} from './db-client.mjs';
import {useAccount} from './use-account';
import {createUid8} from './uid';
import {ARCHIVE_MAX_BYTES,IMPORT_FIELD_ALIASES,UNIVERSAL_IMPORT_ACCEPT,importRowsFromJson,mappedImportValue,normalizeImportMedia,validImportBatchSize,writeImportBatches} from './import-batch.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,repairMojibakeText,resolveGalaxyTitle} from './content-policy';
// A Suno authoring session brings its own BlockNote and Style engine on demand.
const SunoImport=dynamic(()=>import('./SunoImportPanel'),{loading:()=>null});

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
  const createdAt=iso(value('createtime'));
  const mediaCandidates=[value('media'),value('media_link')].filter(item=>item!==''&&item!==undefined&&item!==null);
  let mediaRecords=[],mediaRefs=[];
  try{
    for(const item of mediaCandidates){
      const media=normalizeImportMedia(item,{title:rawTitle,createtime:createdAt,source_place:sourcePlace,galaxy_link:uid});
      mediaRecords.push(...media.records);
      mediaRefs.push(...media.references);
    }
    const seenMediaKeys=new Set();
    mediaRecords=mediaRecords.filter(record=>{
      const key=record.media_id?'id:'+record.media_id:(record.url?JSON.stringify([record.url,record.media_type,record.galaxy_link]):null);
      if(!key)return true;
      if(seenMediaKeys.has(key))return false;
      seenMediaKeys.add(key);return true;
    });
    mediaRefs=[...new Set(mediaRefs)];
  }catch(error){return {record:null,error:String(error.message||error)}}
  if(!content){
    const type=String(value('media_type')||'').trim();
    const url=String(value('url')||'').trim();
    if(type){
      const rawId=String(row.media_id||'').trim();
      if(rawId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId))return {record:null,error:t('uiExtra.importUI.invalidMediaId')};
      return {record:null,error:'',mediaOnlyRecord:{
        ...(rawId?{media_id:rawId}:{}),
        galaxy_link:String(value('galaxy_link')||'').trim()||null,
        source_place:sourcePlace||null,
        media_type:type,title:rawTitle||null,url:url||null,
        meta_tags:String(value('meta_tags')||'').trim()||null,
        createtime:createdAt,
        ...(value('rune_references')?{rune_references:value('rune_references')}:{} )
      }};
    }
    return {record:null,error:t('uiExtra.importUI.invalidNoBody')};
  }
  if([content,rawTitle,sourcePlace].some(hasIrrecoverableEncoding))return {record:null,error:t('uiExtra.importUI.invalidEncoding')};
  if(uid.length!==8)return {record:null,error:t('uiExtra.importUI.invalidUid')};
  const visibility=value('searchable');
  const searchable=!(visibility===false||visibility===0||String(visibility).toLowerCase()==='false'||String(visibility)==='0');
  const record={
    uid,
    title:resolveGalaxyTitle(rawTitle,content),
    content,
    createtime:iso(value('createtime')),
    source_place:sourcePlace||null,
    searchable,
    statistics_able:value('statistics_able')===false||String(value('statistics_able')).toLowerCase()==='false'||!searchable?false:!isPureUrlContent(content),
    source_id:String(value('source_id')||'').trim()||null,
    target_id:normalizeRelationIds(value('target_id')),
    ref_id:String(value('ref_id')||'').trim()||null,
    url:String(value('url')||'').trim()||null,
    ...(mediaRefs.length?{media_link:mediaRefs}:{}),
    source_name:String(source||'').trim()
  };
  return {record,mediaRecords,mediaRefs,error:''};
}

const IMPORT_FORMAT_FIELDS=Object.freeze([
  'uid','content','title','createtime','source_place',
  'url','source_id','target_id','ref_id','searchable','statistics_able',
  'media_link','media','media_type','galaxy_link','meta_tags','rune_references'
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

// Shared idempotent media attachment write for fresh imports and source refresh.
// All records are bound by original article UID; no full-table scan or recursive discovery.
async function syncImportedMedia({normalized=[],mediaOnly=[],knownArticleIds=new Map(),galaxy,galaxyMedia,batchSize=100,t}={}){
      // Media-only imports and embedded media use the same Galaxy Media table.
      // Attach only to article UIDs established by the import plan.
      const plans=normalized.flatMap(item=>{
        const sourceUid=item.record?.uid;
        const owner=knownArticleIds.get(sourceUid);
        return (owner?(item.mediaRecords||[]):[]).map(record=>({...record,galaxy_link:owner}));
      }).concat(mediaOnly);
      const owners=[...new Set(plans.map(record=>String(record.galaxy_link||'').trim()).filter(Boolean))];
      const existingMedia=[];
      for(let offset=0;offset<owners.length;offset+=200){
        const batch=owners.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxyMedia).select('media_id,galaxy_link,url,media_type').in('galaxy_link',batch);
        if(error)throw new Error(error.message||t('uiExtra.importUI.existingMediaFailed'));
        existingMedia.push(...(data||[]));
      }
      const explicitIds=[...new Set([...plans.map(record=>record.media_id).filter(Boolean),...normalized.flatMap(item=>item.mediaRefs||[])])];
      for(let offset=0;offset<explicitIds.length;offset+=200){
        const batch=explicitIds.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxyMedia).select('media_id,galaxy_link,url,media_type').in('media_id',batch);
        if(error)throw new Error(error.message||t('uiExtra.importUI.mediaIdCompareFailed'));
        existingMedia.push(...(data||[]));
      }
      // No full-table scan; unlinked media is matched only by explicit imported URLs.
      const unlinkedUrls=[...new Set(plans.filter(row=>!row.galaxy_link&&row.url).map(row=>row.url))];
      for(let offset=0;offset<unlinkedUrls.length;offset+=200){
        const {data,error}=await dbAuthRelation(galaxyMedia).select('media_id,galaxy_link,url,media_type').in('url',unlinkedUrls.slice(offset,offset+200));
        if(error)throw new Error(error.message||t('uiExtra.importUI.mediaUrlCompareFailed'));
        existingMedia.push(...(data||[]));
      }
      const mediaKey=row=>{
        const url=String(row.url||'').trim();
        return url?JSON.stringify([String(row.galaxy_link||'').trim(),url,String(row.media_type||'').trim()])
          :(row.media_id?'id:'+row.media_id:null);
      };
      const byKey=new Map(existingMedia.map(row=>[mediaKey(row),row]).filter(([key])=>key));
      const byId=new Map(existingMedia.map(row=>[String(row.media_id),row]));
      const createMedia=[],related=new Map(),seenMedia=new Set();
      function attach(uid,id){
        if(!uid||!id)return;
        if(!related.has(uid))related.set(uid,new Set());
        related.get(uid).add(id);
      }
      for(const item of normalized){
        const uid=knownArticleIds.get(item.record?.uid);
        for(const mediaId of item.mediaRefs||[]){
          if(!byId.has(mediaId))throw new Error(t('uiExtra.importUI.missingMediaReference',{id:mediaId}));
          attach(uid,mediaId);
        }
      }
      for(const raw of plans){
        const record={...raw},key=mediaKey(record),owner=String(record.galaxy_link||'').trim();
        const known=record.media_id?byId.get(String(record.media_id)):(key?byKey.get(key):null);
        if(known){attach(owner,known.media_id);continue;}
        if(key&&seenMedia.has(key))continue;
        if(key)seenMedia.add(key);
        const mediaId=record.media_id||globalThis.crypto?.randomUUID?.();
        if(!mediaId)throw new Error(t('uiExtra.importUI.mediaUuidUnavailable'));
        record.media_id=mediaId;
        createMedia.push(record);if(key)byKey.set(key,record);byId.set(mediaId,record);
        attach(owner,mediaId);
      }
      await writeImportBatches(createMedia,{
        batchSize:validImportBatchSize(batchSize),
        writeBatch:batch=>insertRows(galaxyMedia,batch)
      });
      let connected=0;
      const linkedUids=[...related.keys()];
      for(let offset=0;offset<linkedUids.length;offset+=200){
        const {data,error}=await dbAuthRelation(galaxy).select('uid,media_link').in('uid',linkedUids.slice(offset,offset+200));
        if(error)throw new Error(error.message||t('uiExtra.importUI.mediaLinkReadFailed'));
        for(const row of data||[]){
          const uid=String(row.uid||'').trim();
          const prior=Array.isArray(row.media_link)?row.media_link.map(String):[];
          const after=[...new Set([...prior,...(related.get(uid)||[])])];
          if(after.length!==prior.length){await updateRows(galaxy,{media_link:after},{filters:[{column:'uid',operator:'eq',value:uid}]});connected++;}
        }
      }

  return {created:createMedia.length,connected};
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
      normalized:normalized.filter(item=>item.record),
      mediaOnly:normalized.filter(item=>item.mediaOnlyRecord).map(item=>item.mediaOnlyRecord),
      invalid:normalized.filter(item=>item.error)
    };
  },[rows,source,format.fields,locale]);
  if(!account.canManageScopeSync(scopeId))return null;

  async function loadQueuedFile(file,index,total){
    setFileName(file.name);setRows([]);setArchiveDetection(null);setProgress(null);setStatus('');
    if(file.size>ARCHIVE_MAX_BYTES){
      setStatus(t('uiExtra.importUI.zipTooLarge'));
      return;
    }
    const firstBytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
    const isZip=/\.zip$/i.test(file.name)||(firstBytes[0]===80&&firstBytes[1]===75&&[3,5,7].includes(firstBytes[2]));
    if(isZip){setBusy(true);setStatus(t('uiExtra.importUI.zipInspecting'));}
    try{
      if(isZip){
        const {detectZipArchiveSource}=await import('./private-archive-universal.mjs');
        const result=await detectZipArchiveSource(file);
        setArchiveDetection(result);
        setSource(result.sources.length===1?result.sources[0]:'');
        setStatus(t('uiExtra.importUI.zipInspected',{count:result.filesSeen}));
        return;
      }
      const {parseUniversalImportFile}=await import('./universal-file-import.mjs');
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
    if(!analyzed.valid.length&&!analyzed.mediaOnly.length){setStatus(t('uiExtra.importUI.noValidItems'));return;}
    setBusy(true);onBusyChange?.(true);setStatus(t('uiExtra.importUI.checkingUids'));
    setProgress({completed:0,total:analyzed.valid.length+analyzed.mediaOnly.length,percent:0});
    try{
      const scope=account.scopeDataFor(scopeId);
      const galaxy=scope?.galaxy,galaxyMedia=scope?.galaxyMedia;
      if(!galaxy||!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const unique=[],seenUid=new Set();
      let duplicateCount=0;
      for(const record of analyzed.valid){
        if(seenUid.has(record.uid)){duplicateCount++;continue;}
        seenUid.add(record.uid);
        unique.push(record);
      }
      const existingUid=new Set(),existingByNative=new Map();
      for(let offset=0;offset<unique.length;offset+=200){
        const ids=unique.slice(offset,offset+200).map(record=>record.uid);
        const {data,error}=await dbAuthRelation(galaxy).select('uid').in('uid',ids);
        if(error)throw new Error(error.message||t('uiExtra.importUI.existingUidFailed'));
        for(const row of data||[])existingUid.add(String(row.uid||'').trim());
      }
      const payload=unique.filter(record=>!existingUid.has(record.uid));
      const knownArticleIds=new Map(unique.map(row=>[row.uid,row.uid]));
      await writeImportBatches(payload,{
        batchSize:validImportBatchSize(format.batchSize),
        writeBatch:batch=>insertRows(galaxy,batch),
        onProgress:p=>setProgress({completed:p.completed,total:payload.length+analyzed.mediaOnly.length,percent:Math.round(100*p.completed/Math.max(1,payload.length+analyzed.mediaOnly.length))})
      });
      const mediaSummary=await syncImportedMedia({normalized:analyzed.normalized,mediaOnly:analyzed.mediaOnly,knownArticleIds,galaxy,galaxyMedia,batchSize:format.batchSize,t});
      const skipped=analyzed.invalid.length+duplicateCount+unique.length-payload.length;
      setProgress({completed:payload.length+mediaSummary.created,total:payload.length+mediaSummary.created,percent:100});
      setStatus(t('uiExtra.importUI.importLinkedComplete',{articles:payload.length,media:mediaSummary.created,linked:mediaSummary.connected,skipped}));
      setRows([]);
    }catch(error){setStatus(String(error?.message||error||t('uiExtra.importUI.importFailed'))+t('uiExtra.importUI.importRetry'))}
    finally{setBusy(false);onBusyChange?.(false);}
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
    // Refresh only targets records with an explicit article UID.
    const valid=normalized.filter(item=>item.record&&String(mappedImportValue(item.raw,'uid',format.fields)||'').trim()).map(item=>item.record);
    const invalid=normalized.length-valid.length;
    if(!valid.length){setPlan({creates:[],updates:[],unchanged:[],invalid});setStatus(t('uiExtra.importUI.noUid'));return;}
    setBusy(true);onBusyChange?.(true);setStatus(t('uiExtra.importUI.analyzing'));setProgress(null);
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const existing=[];
      const ids=[...new Set(valid.map(row=>row.uid))];
      for(let offset=0;offset<ids.length;offset+=200){
        const batch=ids.slice(offset,offset+200);
        const {data,error}=await dbAuthRelation(galaxy)
          .select('uid,title,content,createtime,source_place,url,searchable,statistics_able,source_name')
          .eq('source_name',selected)
          .in('uid',batch);
        if(error)throw new Error(error.message||t('uiExtra.importUI.refreshCompareFailed'));
        existing.push(...(data||[]));
      }
      const byUid=new Map(existing.map(row=>[String(row.uid||'').trim(),row]));
      const hasExplicit=(item,field)=>{
        const value=mappedImportValue(item.raw,field,format.fields);
        return value!==undefined&&value!==null&&String(value).trim()!=='';
      };
      const explicitFlags=new Map(normalized.filter(item=>item.record).map(item=>[
        item.record.uid,{
          searchable:hasExplicit(item,'searchable'),
          statistics_able:hasExplicit(item,'statistics_able')
        }
      ]));
      const creates=[],updates=[],unchanged=[],seen=new Set();
      for(const record of valid){
        if(seen.has(record.uid))continue;
        seen.add(record.uid);
        const current=byUid.get(record.uid);
        const explicit=explicitFlags.get(record.uid)||{};
        if(!current){creates.push(record);continue;}
        const next={
          ...record,
          uid:current.uid,
          searchable:explicit.searchable?record.searchable:current.searchable,
          statistics_able:explicit.statistics_able?record.statistics_able:current.statistics_able,
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
      const galaxyMedia=account.scopeDataFor(scopeId)?.galaxyMedia;
      if(!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const original=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields,t))
        .filter(item=>item.record);
      const knownArticleIds=new Map([...plan.creates,...plan.updates,...plan.unchanged].map(row=>[row.uid,row.uid]));
      const mediaSummary=await syncImportedMedia({
        normalized:original,knownArticleIds,galaxy,galaxyMedia,batchSize:format.batchSize,t
      });
      setStatus(t('uiExtra.importUI.refreshComplete',{created:plan.creates.length.toLocaleString(),updated:plan.updates.length.toLocaleString()}) +t('uiExtra.importUI.refreshMediaSuffix',{media:mediaSummary.created,linked:mediaSummary.connected}));
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

// "資料重整": a manual, on-demand pass -- run once after an import, or any
// time from this button -- never automatic. The matching itself runs as one
// SQL query in the database (silver.find_galaxy_duplicates): group by exact
// createtime, then by exact canonicalized content within that group. A pair
// that doesn't match on both stays listed as two separate rows -- that's
// deliberate (an edited duplicate may no longer match; keeping both beats
// auto-merging two different posts). Nothing is ever deleted automatically;
// every checkbox here is a row the person reviewed and chose themselves.
function DuplicateDetection({scopeId}){
  const t=useUiText();
  const account=useAccount();
  const [groups,setGroups]=useState(null);
  const [selected,setSelected]=useState(()=>new Set());
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  if(!account.canManageScopeSync(scopeId))return null;

  function formatTime(value){
    return value?String(value).slice(0,19).replace('T',' '):'';
  }

  async function scan(){
    setBusy(true);setStatus(t('uiExtra.importUI.duplicateScanning'));setGroups(null);setSelected(new Set());
    try{
      const found=await findGalaxyDuplicates(scopeId);
      setGroups(found);
      setStatus(found.length?t('uiExtra.importUI.duplicateGroupsFound',{count:found.length}):t('uiExtra.importUI.duplicateNoneFound'));
    }catch(error){
      setGroups(null);
      setStatus(String(error?.message||error||t('uiExtra.importUI.duplicateScanFailed')));
    }finally{setBusy(false);}
  }

  function toggle(uid){
    setSelected(current=>{
      const next=new Set(current);
      if(next.has(uid))next.delete(uid);else next.add(uid);
      return next;
    });
  }

  async function removeSelected(){
    if(!selected.size||busy)return;
    setBusy(true);setStatus('');
    try{
      const galaxy=account.scopeDataFor(scopeId)?.galaxy;
      if(!galaxy)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      const uids=[...selected];
      // management_write's delete path only accepts eq filters -- one call per row.
      for(const uid of uids){
        await deleteRows(galaxy,{filters:[{column:'uid',operator:'eq',value:uid}]});
      }
      setGroups(current=>(current||[])
        .map(group=>({
          ...group,
          titles:group.titles.filter((_,index)=>!selected.has(group.uids[index])),
          updateTimes:group.updateTimes.filter((_,index)=>!selected.has(group.uids[index])),
          uids:group.uids.filter(uid=>!selected.has(uid))
        }))
        .filter(group=>group.uids.length>1));
      setStatus(t('uiExtra.importUI.duplicateDeleted',{count:uids.length}));
      setSelected(new Set());
    }catch(error){
      setStatus(String(error?.message||error||t('uiExtra.importUI.duplicateDeleteFailed')));
    }finally{setBusy(false);}
  }

  return <div className="scope-inline-card">
    <h4><UiText id="uiExtra.importUI.duplicateTitle"/></h4>
    <p><UiText id="uiExtra.importUI.duplicateHelp"/></p>
    <div className="scope-tabs">
      <button type="button" disabled={busy} onClick={scan}>
        {busy?t('uiExtra.importUI.duplicateScanning'):t('uiExtra.importUI.duplicateRun')}
      </button>
      <button type="button" disabled={busy||!selected.size} onClick={removeSelected}>
        <UiText id="uiExtra.importUI.duplicateDeleteSelected" params={{count:selected.size}}/>
      </button>
    </div>
    {status?<p className="scope-status" role="status">{status}</p>:null}
    {groups&&groups.length?<div className="scope-management-records">
      {groups.map((group,groupIndex)=><article className="scope-inline-card" key={group.sourceName+':'+group.createtime+':'+groupIndex}>
        <strong>{group.sourceName} · {formatTime(group.createtime)}</strong>
        <div className="scope-management-fields">
          {group.uids.map((uid,index)=><label key={uid}>
            <input type="checkbox" checked={selected.has(uid)} onChange={()=>toggle(uid)}/>
            <span>{group.titles[index]||uid}</span>
            <span>{uid}</span>
            <span><UiText id="uiExtra.importUI.duplicateUpdated" params={{time:formatTime(group.updateTimes[index])||'—'}}/></span>
          </label>)}
        </div>
      </article>)}
    </div>:null}
  </div>;
}

export default function ManagementImportPanel({scopeId}){
  useUiSection('management');
  useUiSection('uiExtra.importUI');
  const [format,setFormat]=useState({recordPath:'',batchSize:100,fields:{}});
  const [revision,setRevision]=useState(0);
  const [busyCount,setBusyCount]=useState(0);
  const [sunoOpen,setSunoOpen]=useState(false);
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
    <DuplicateDetection scopeId={scopeId}/>
    <button type="button" className="loc-button" aria-expanded={sunoOpen}
      onClick={()=>setSunoOpen(open=>!open)}><UiText id="uiExtra.importUI.sunoImport"/></button>
    {sunoOpen?<SunoImport scopeId={scopeId}/>:null}
  </section>;
}
