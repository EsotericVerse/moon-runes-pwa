'use client';

import {useUiCopy,useUiLocale,useUiSection} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection,UI_LOCALE_OPTIONS} from '../i18n/ui-copy';
import managementZh from '../i18n/sections/management.zh_tw.js';
import importUIZh from '../i18n/sections/uiExtra.importUI.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.importUI',importUIZh);

import {useDeferredValue,useMemo,useRef,useState} from 'react';
import {insertRows,dbAuthRelation,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {Capacitor} from '@capacitor/core';
import {defaultScopeData} from './scope-data';
import {createUid8} from './uid';
import {facebookBackupPlace,facebookBackupPostText,facebookBackupTimestamp,facebookArchiveGalaxyRow} from './facebook-backup-place.mjs';
import {ARCHIVE_MAX_BYTES,IMPORT_FIELD_ALIASES,UNIVERSAL_IMPORT_ACCEPT,mappedImportValue,normalizeImportMedia,parseImportCreatedTime,validImportBatchSize,writeImportBatches} from './import-batch.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText,resolveGalaxyTitle} from './content-policy';
const ZIP_LAYOUT_KEYS=Object.freeze({
  'conversation-tree':'conversationTree','message-list':'messageList','post-list':'postList',
  activity:'activity',media:'media',table:'table','structured-records':'records',document:'document'
});
const ZIP_FIELD_KEYS=Object.freeze(['id','text','author','time','relation','attachment','collection']);
const ZIP_SOURCE_NAMES=Object.freeze({chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',grok:'Grok',copilot:'Microsoft Copilot',perplexity:'Perplexity', 'meta-ai':'Meta AI',facebook:'Facebook',messenger:'Messenger',instagram:'Instagram',threads:'Threads',whatsapp:'WhatsApp',x:'X / Twitter',telegram:'Telegram',discord:'Discord',line:'LINE',slack:'Slack',teams:'Microsoft Teams',snapchat:'Snapchat',wechat:'WeChat',tiktok:'TikTok',reddit:'Reddit',linkedin:'LinkedIn',pinterest:'Pinterest',youtube:'YouTube','google-takeout':'Google Takeout'});
// Same cooldown pattern as keyword classification (KeywordLibraryPanel.jsx):
// a purely client-side, no-DB-attribute 5-minute gate after a bulk write
// completes. NOTE: this is a debounce against re-triggering a bulk write
// while a prior one may still be settling, not a confirmed fix for a known
// root cause -- live Supabase edge_logs for the read-side failure this was
// modeled on actually showed Postgres error 57014 (query_canceled), not a
// rate-limit/abuse rejection, so "Supabase bans repeated requests" is NOT
// an established cause. Keep this as a precaution against rapid re-clicks
// until the real mechanism is confirmed.
const BULK_WRITE_COOLDOWN_MS=300000;
function useBulkWriteCooldown(){
  const [active,setActive]=useState(false);
  const availableAtRef=useRef(0);
  return {
    active,
    remainingMs(){return availableAtRef.current-Date.now()},
    start(){
      availableAtRef.current=Date.now()+BULK_WRITE_COOLDOWN_MS;
      setActive(true);
      setTimeout(()=>setActive(false),BULK_WRITE_COOLDOWN_MS);
    }
  };
}
function sourceSuggestion(name=''){
  const value=String(name).toLowerCase();
  if(/your_posts|status_updates|facebook_activity/i.test(value))return 'Facebook';
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
  const isFacebook=String(source||'').trim().toLowerCase()==='facebook';
  // The generic "place" alias can hold a Meta object. Only actual text
  // belongs in Galaxy.source_place; never stringify [object Object].
  const mappedPlace=value('source_place');
  const placeText=typeof mappedPlace==='string'?mappedPlace:
    (isFacebook?facebookBackupPlace(row):'');
  const place=repairMojibakeText(placeText).trim();
  const facebookText=isFacebook?facebookBackupPostText(row):'';
  const content=normalizeGalaxyContent(value('content')||facebookText||
    (isFacebook&&place?'Facebook 打卡地點：'+place:''));
  const rawTitle=repairMojibakeText(value('title')).trim();
  const sourcePlace=place;
  const uid=String(value('uid')||entry?.import_uid||createUid8()).trim().toUpperCase();
  const rawDate=value('createtime')||(isFacebook?facebookBackupTimestamp(row):null);
  const createdAt=isFacebook?parseImportCreatedTime(rawDate):iso(rawDate);
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
    createtime:createdAt,
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

function ImportFormatSettings({format,onChange,disabled=false,source='',onSourceChange,sourceDisabled=false,suggested=''}){
  const t=useUiText();
  const update=(key,value)=>onChange({...format,[key]:value});
  const updateField=(key,value)=>onChange({...format,fields:{...format.fields,[key]:value}});
  return <details className="loc-bubble scope-import-format">
    <summary><UiText id="uiExtra.importUI.formatSummary"/><span className="scope-import-format-mark" aria-hidden="true"/></summary>
    <div className="scope-management-fields">
      <label><UiText id="uiExtra.importUI.sourceLabel"/>
        <input disabled={disabled||sourceDisabled} value={source} onChange={e=>onSourceChange?.(e.target.value)} placeholder={suggested}/>
      </label>
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

// Shared idempotent media attachment write for standard file imports.
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

function UniversalImport({scopeId,format,onFormatChange}) {
  const {locale}=useUiLocale();
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const nativeLocal=scopeId==='local'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios';
  const account=useAccount({enabled:!nativeLocal});
  const [fileName,setFileName]=useState('');
  const [archiveDetection,setArchiveDetection]=useState(null);
  const [rows,setRows]=useState([]);
  const [queue,setQueue]=useState([]);
  const [queueIndex,setQueueIndex]=useState(0);
  const [source,setSource]=useState('');
  const [importLocale,setImportLocale]=useState('zh-Hant');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const writeCooldown=useBulkWriteCooldown();
  const suggested=useMemo(()=>sourceSuggestion(fileName),[fileName]);
  const deferredSource=useDeferredValue(source);
  const analysisCurrent=deferredSource===source;
  const analyzed=useMemo(()=>{
    const selected=deferredSource.trim();
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,selected,format.fields,t));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      normalized:normalized.filter(item=>item.record),
      mediaOnly:normalized.filter(item=>item.mediaOnlyRecord).map(item=>item.mediaOnlyRecord),
      invalid:normalized.filter(item=>item.error)
    };
  },[rows,deferredSource,format.fields,locale]);
  if(!nativeLocal&&!account.canManageScopeSync(scopeId))return null;

  async function loadQueuedFile(file,index,total,language=importLocale,recordPath=format.recordPath){
    setFileName(file.name);setRows([]);setArchiveDetection(null);setProgress(null);setStatus('');
    if(file.size>ARCHIVE_MAX_BYTES){
      setStatus(t('uiExtra.importUI.zipTooLarge'));
      return;
    }
    const firstBytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
    const isZip=/\.zip$/i.test(file.name)||(firstBytes[0]===80&&firstBytes[1]===75&&[3,5,7].includes(firstBytes[2]));
    setBusy(true);
    if(isZip)setStatus(t('uiExtra.importUI.zipInspecting'));
    try{
      if(isZip){
        const {detectZipArchiveSource,inspectPrivateArchive}=await import('./private-archive-universal.mjs');
        const result=await detectZipArchiveSource(file);
        setArchiveDetection(result);
        if(!result.sources.includes('facebook')){
          setSource(result.sources.length===1?result.sources[0]:'');
          setStatus(t('uiExtra.importUI.zipInspected',{count:result.filesSeen}));
          return;
        }
        // Parse only confirmed Facebook post/check-in text. Messenger and
        // media inside a mixed Meta Takeout ZIP are never imported as posts.
        const imported=[],uidOwners=new Map();
        let ignored=0;
        await inspectPrivateArchive(file,{onRecord:record=>{
          const article=facebookArchiveGalaxyRow(record);
          if(!article){ignored++;return;}
          const previous=uidOwners.get(article.uid);
          if(previous&&previous!==record.key)
            throw Error('Facebook 備份紀錄 UID 雜湊衝突，已停止匯入，沒有寫入資料庫。');
          uidOwners.set(article.uid,record.key);
          if(imported.length>=30000)
            throw Error('Facebook 文字貼文超過本次 30,000 筆安全上限，未匯入。');
          imported.push({raw:article,import_uid:article.uid});
        }});
        if(!imported.length)throw Error('備份內沒有可匯入的 Facebook 貼文或打卡文字。');
        setRows(imported);
        setSource('Facebook');
        setStatus('已從 Facebook 備份辨識 '+imported.length.toLocaleString()+
          ' 篇貼文／打卡文字，另略過 '+ignored.toLocaleString()+
          ' 筆非貼文紀錄。請核對預覽後再按匯入。');
        return;
      }
      const {parseUniversalImportFile}=await import('./universal-file-import.mjs');
      const list=await parseUniversalImportFile(file,{recordPath,importLocale:language});
      const prepared=list.map(row=>({
        raw:row,
        import_uid:createUid8()
      }));
      setRows(prepared);
      // Galaxy Markdown metadata suggests an initial source; the user may override it.
      setSource(String(list[0]?.source_name||'').trim()||sourceSuggestion(file.name));
      setStatus(t('uiExtra.importUI.parsedFile',{index:index+1,total,count:list.length.toLocaleString()}));
    }catch(error){
      setRows([]);
      setStatus(t('uiExtra.importUI.parseFileFailed',{index:index+1,error:error?.message||error}));
    }finally{
      setBusy(false);
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
    if(writeCooldown.remainingMs()>0){setStatus(t('uiExtra.importUI.writeCooldownActive'));return;}
    const selected=source.trim();
    if(!selected){setStatus(t('uiExtra.importUI.selectSource'));return;}
    if(!analyzed.valid.length&&!analyzed.mediaOnly.length){setStatus(t('uiExtra.importUI.noValidItems'));return;}
    setBusy(true);setStatus(t('uiExtra.importUI.checkingUids'));
    setProgress({completed:0,total:analyzed.valid.length+analyzed.mediaOnly.length,percent:0});
    try{
      const scope=nativeLocal?defaultScopeData('local'):account.scopeDataFor(scopeId);
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
      if(nativeLocal)window.dispatchEvent(new Event('loc-local-data-changed'));
      writeCooldown.start();
    }catch(error){setStatus(String(error?.message||error||t('uiExtra.importUI.importFailed'))+t('uiExtra.importUI.importRetry'))}
    finally{setBusy(false);}
  }
  async function chooseImportLocale(event){
    if(busy)return;
    const next=event.target.value;
    setImportLocale(next);
    if(queue.length)await loadQueuedFile(queue[queueIndex],queueIndex,queue.length,next);
  }
  function changeImportFormat(next){
    if(busy)return;
    onFormatChange(next);
    // A changed record path changes the parsed file, not just field mapping.
    // Reparse the queued file in place instead of resetting the whole import.
    if(next.recordPath!==format.recordPath&&queue.length)
      void loadQueuedFile(queue[queueIndex],queueIndex,queue.length,importLocale,next.recordPath);
  }
  const pending=queue.length>queueIndex+1;
  return <div className="scope-import-body">
    <div className="scope-import-primary-row">
      <label><UiText id="uiExtra.importUI.importLanguage"/>
        <select className="scope-select" value={importLocale} disabled={busy} onChange={chooseImportLocale}>
          {UI_LOCALE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label><UiText id="uiExtra.importUI.fileSource"/>
        <input type="file" accept={UNIVERSAL_IMPORT_ACCEPT} multiple disabled={busy} onChange={chooseFile}/>
      </label>
      <button type="button" className="loc-button" disabled={busy||!analysisCurrent||(!analyzed.valid.length&&!analyzed.mediaOnly.length)||writeCooldown.active} onClick={run}>
        {busy?UI_COPY.management.importing:t('uiExtra.importUI.batchImport')}
      </button>
    </div>
    <ImportFormatSettings format={format} onChange={changeImportFormat} disabled={busy}
      source={source} onSourceChange={setSource} sourceDisabled={!rows.length} suggested={suggested}/>
    {fileName?<p><UiText id="uiExtra.importUI.fileLabel"/><strong>{fileName}</strong><UiText id="uiExtra.importUI.fileQueue" params={{index:queueIndex+1,total:queue.length}}/><strong>{archiveDetection?(archiveDetection.sources.map(kind=>ZIP_SOURCE_NAMES[kind]||kind).join(' / ')||t('uiExtra.importUI.zipUnknown')):source||suggested}</strong></p>:null}
    {archiveDetection?<section className="scope-import-preview" aria-label={t('uiExtra.importUI.zipDetected')}>
      <dl className="scope-import-facts">
        <div><dt>{t('uiExtra.importUI.zipDetected')}</dt><dd>{archiveDetection.sources.map(kind=>ZIP_SOURCE_NAMES[kind]||kind).join(' / ')||t('uiExtra.importUI.zipUnknown')}</dd></div>
        <div><dt>{t('uiExtra.importUI.zipConfidence')}</dt><dd>{t(archiveDetection.confidence===3?'uiExtra.importUI.zipVerified':archiveDetection.confidence?'uiExtra.importUI.zipPossible':'uiExtra.importUI.zipUnknown')}</dd></div>
        {archiveDetection.evidence.length?<div><dt>{t('uiExtra.importUI.zipEvidence')}</dt><dd>{archiveDetection.evidence.map(item=>item.path).join('、')}</dd></div>:null}
        {Object.keys(archiveDetection.structure?.layouts||{}).length?<div><dt>{t('uiExtra.importUI.zipLayouts')}</dt><dd>{Object.entries(archiveDetection.structure.layouts).map(([kind,count])=>
          t('uiExtra.importUI.zipLayout.'+(ZIP_LAYOUT_KEYS[kind]||'records'))+' '+count).join('、')}</dd></div>:null}
        {Object.keys(archiveDetection.structure?.formats||{}).length?<div><dt>{t('uiExtra.importUI.zipFormats')}</dt><dd>{Object.entries(archiveDetection.structure.formats).map(([kind,count])=>kind.toUpperCase()+' '+count).join('、')}</dd></div>:null}
        {ZIP_FIELD_KEYS.some(key=>archiveDetection.structure?.fields?.[key])?<div><dt>{t('uiExtra.importUI.zipFields')}</dt><dd>{ZIP_FIELD_KEYS.filter(key=>archiveDetection.structure?.fields?.[key]).map(key=>
          t('uiExtra.importUI.zipField.'+key)).join('、')}</dd></div>:null}
      </dl>
      <p className="scope-status">{t('uiExtra.importUI.zipStructureCount',{count:archiveDetection.structure?.sampledFiles||0})}</p>
      {archiveDetection.audit?<details className="scope-import-audit">
        <summary>{t('uiExtra.importUI.zipAuditTitle')}</summary>
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
        {archiveDetection.audit.attention.length?<ul>{archiveDetection.audit.attention.slice(0,10).map((item,i)=>
          <li key={i}>{item.path} — {t('uiExtra.importUI.zipAuditReason.'+item.reason)}</li>)}</ul>:null}
        <p>{t('uiExtra.importUI.zipAuditCaveat')}</p>
      </details>:null}
      <p className="scope-status">{t('uiExtra.importUI.zipReadOnly')}</p>
    </section>:null}
    {rows.length?<section className="scope-import-preview" aria-label={t('uiExtra.importUI.preview')}>
      <p className="scope-status"><UiText id="uiExtra.importUI.validSkipped" params={{valid:analyzed.valid.length.toLocaleString(),skipped:analyzed.invalid.length.toLocaleString()}}/></p>
      <div className="scope-management-records">
        {analyzed.valid.slice(0,5).map(record=><article className="loc-bubble" key={record.uid}>
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
    {pending&&!rows.length?<div className="scope-tabs"><button type="button" disabled={busy} onClick={nextFile}><UiText id="uiExtra.importUI.nextJson"/></button></div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </div>;
}


export default function ManagementImportPanel({scopeId}){
  useUiSection('management');
  useUiSection('uiExtra.importUI');
  const [format,setFormat]=useState({recordPath:'',batchSize:100,fields:{}});
  return <div className="scope-management-imports">
    <section className="loc-card scope-import-primary">
      <h2><UiText id="uiExtra.importUI.importTitle"/></h2>
      <UniversalImport scopeId={scopeId} format={format} onFormatChange={setFormat}/>
    </section>
  </div>;
}
