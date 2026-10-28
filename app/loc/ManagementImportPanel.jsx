'use client';

import {useUiCopy,useUiLocale,useUiSection} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection,UI_LOCALE_OPTIONS} from '../i18n/ui-copy';
import managementZh from '../i18n/sections/management.zh_tw.js';
import importUIZh from '../i18n/sections/uiExtra.importUI.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.importUI',importUIZh);

import {useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import {insertRows,dbAuthRelation,dbAuthClient,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {Capacitor} from '@capacitor/core';
import {defaultScopeData} from './scope-data';
import {createUid8} from './uid';
import {facebookBackupPlace,facebookBackupPostText,facebookBackupTimestamp,facebookBackupImportUid} from './facebook-backup-place.mjs';
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {facebookArchiveUid} from './facebook-backup-place.mjs';
import {comparableImportText,dedupeIncomingImport,findExistingImportDuplicates} from './import-duplicate-check.mjs';
import {isPublicArchiveRecord,isPrivateArchiveEntry,filterStandalonePublicRows,assertStandaloneImportDestination} from './archive-import-safety.mjs';
import {createArchiveEvidenceCollector,prepareArchiveMedia} from './archive-media-evidence.mjs';
import {ARCHIVE_MAX_BYTES,IMPORT_FIELD_ALIASES,UNIVERSAL_IMPORT_ACCEPT,mappedImportValue,normalizeImportMedia,parseImportCreatedTime,writeImportBatches} from './import-batch.mjs';
import {MAX_ROWS,urlSafeInBatches} from './query-batch-size.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText,resolveGalaxyTitle} from './content-policy';
const ZIP_LAYOUT_KEYS=Object.freeze({
  'conversation-tree':'conversationTree','message-list':'messageList','post-list':'postList',
  activity:'activity',media:'media',table:'table','structured-records':'records',document:'document'
});
const ZIP_FIELD_KEYS=Object.freeze(['id','text','author','time','relation','attachment','collection']);
const ZIP_SOURCE_NAMES=Object.freeze({chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',grok:'Grok',copilot:'Microsoft Copilot',perplexity:'Perplexity', 'meta-ai':'Meta AI',facebook:'Facebook',messenger:'Messenger',instagram:'Instagram',threads:'Threads',whatsapp:'WhatsApp',x:'X / Twitter',telegram:'Telegram',discord:'Discord',line:'LINE',slack:'Slack',teams:'Microsoft Teams',snapchat:'Snapchat',wechat:'WeChat',tiktok:'TikTok',reddit:'Reddit',linkedin:'LinkedIn',pinterest:'Pinterest',youtube:'YouTube','google-takeout':'Google Takeout'});
function sourceSuggestion(name=''){
  const value=String(name).toLowerCase();
  if(/your_posts|status_updates|facebook_activity|places_you_have_been_tagged_in/i.test(value))return 'Facebook';
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
  const isThreads=String(source||'').trim().toLowerCase()==='threads';
  // The generic "place" alias can hold a Meta object. Only actual text
  // belongs in Galaxy.source_place; never stringify [object Object].
  const mappedPlace=value('source_place');
  const placeText=typeof mappedPlace==='string'?mappedPlace:
    (isFacebook?facebookBackupPlace(row):'');
  const place=repairMojibakeText(placeText).trim();
  const facebookText=isFacebook?facebookBackupPostText(row):'';
  const threadsText=isThreads?(row.media?.find?.(item=>typeof item?.title==='string')?.title||
    row.string_list_data?.find?.(item=>typeof item?.value==='string')?.value||''):'';
  const content=normalizeGalaxyContent(value('content')||facebookText||threadsText||
    (isFacebook&&place?'Facebook 打卡地點：'+place:''));
  const rawTitle=repairMojibakeText(value('title')).trim();
  const sourcePlace=place;
  const rawDate=value('createtime')||
    (isThreads?row.media?.find?.(item=>item?.creation_timestamp)?.creation_timestamp:null)||
    (isFacebook?facebookBackupTimestamp(row):null);
  const createdAt=parseImportCreatedTime(rawDate);
  const nativeThreadsId=isThreads?String(row.id||row.post_id||row.thread_id||'').trim():'';
  const stableThreadsKey=isThreads&&(nativeThreadsId||createdAt&&comparableImportText(content))
    ?'threads:json:'+JSON.stringify([nativeThreadsId||null,createdAt,comparableImportText(content)]):'';
  const uid=String(value('uid')||(isFacebook?facebookBackupImportUid(row):stableThreadsKey?facebookArchiveUid(stableThreadsKey):entry?.import_uid||createUid8())).trim().toUpperCase();
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
      <p className="scope-status">MaxRows：{MAX_ROWS.toLocaleString()}（系統統一設定，無須調整批次大小）</p>
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

// A GET .in() filter has a URL budget, unlike POST imports.
// Count and page each query until all matched rows are returned.
async function readExistingByIds(table,columns,column,values,message){
  const records=[],orderColumn=table.endsWith('_media')?'media_id':'uid';
  for(const batch of urlSafeInBatches(values,column)){
    let offset=0;
    for(;;){
      const {data,error,count}=await dbAuthRelation(table)
        .select(columns,{count:'exact'}).in(column,batch)
        .order(orderColumn,{ascending:true}).range(offset,offset+MAX_ROWS-1);
      if(error)throw new Error(error.message||message);
      const rows=data||[];
      records.push(...rows);
      offset+=rows.length;
      if(!rows.length||(count!=null&&offset>=Number(count)))break;
    }
  }
  return records;
}

// Shared idempotent media attachment write for standard file imports.
// All records are bound by original article UID; no full-table scan or recursive discovery.
async function syncImportedMedia({normalized=[],mediaOnly=[],extraLinks=[],knownArticleIds=new Map(),galaxy,galaxyMedia,t}={}){
      // Media-only imports and embedded media use the same Galaxy Media table.
      // Attach only to article UIDs established by the import plan.
      const plans=normalized.flatMap(item=>{
        const sourceUid=item.record?.uid;
        const owner=knownArticleIds.get(sourceUid);
        return (owner?(item.mediaRecords||[]):[]).map(record=>({...record,galaxy_link:owner}));
      }).concat(mediaOnly);
      const owners=[...new Set(plans.map(record=>String(record.galaxy_link||'').trim()).filter(Boolean))];
      const existingMedia=[];
      existingMedia.push(...await readExistingByIds(galaxyMedia,'media_id,galaxy_link,url,media_type','galaxy_link',owners,t('uiExtra.importUI.existingMediaFailed')));
      const explicitIds=[...new Set([...plans.map(record=>record.media_id).filter(Boolean),...normalized.flatMap(item=>item.mediaRefs||[])])];
      existingMedia.push(...await readExistingByIds(galaxyMedia,'media_id,galaxy_link,url,media_type','media_id',explicitIds,t('uiExtra.importUI.mediaIdCompareFailed')));
      // No full-table scan; unlinked media is matched only by explicit imported URLs.
      const unlinkedUrls=[...new Set(plans.filter(row=>!row.galaxy_link&&row.url).map(row=>row.url))];
      existingMedia.push(...await readExistingByIds(galaxyMedia,'media_id,galaxy_link,url,media_type','url',unlinkedUrls,t('uiExtra.importUI.mediaUrlCompareFailed')));
      const mediaKey=row=>{
        const url=String(row.url||'').trim();
        return url?JSON.stringify([String(row.galaxy_link||'').trim(),url,String(row.media_type||'').trim()])
          :(row.media_id?'id:'+row.media_id:null);
      };
      const byKey=new Map(existingMedia.map(row=>[mediaKey(row),row]).filter(([key])=>key));
      const byId=new Map(existingMedia.map(row=>[String(row.media_id),row]));
      const createMedia=[],related=new Map(),seenMedia=new Set(),resolvedIds=new Map();
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
        const known=(record.media_id?byId.get(String(record.media_id)):null)||(key?byKey.get(key):null);
        if(known){if(record.media_id)resolvedIds.set(String(record.media_id),String(known.media_id));attach(owner,known.media_id);continue;}
        if(key&&seenMedia.has(key))continue;
        if(key)seenMedia.add(key);
        const mediaId=record.media_id||globalThis.crypto?.randomUUID?.();
        if(!mediaId)throw new Error(t('uiExtra.importUI.mediaUuidUnavailable'));
        record.media_id=mediaId;
        createMedia.push(record);if(key)byKey.set(key,record);byId.set(mediaId,record);
        attach(owner,mediaId);
      }
      await writeImportBatches(createMedia,{
        batchSize:MAX_ROWS,
        writeBatch:batch=>insertRows(galaxyMedia,batch)
      });
      for(const link of extraLinks){
        const uid=knownArticleIds.get(String(link.uid||'').trim());
        const mediaId=resolvedIds.get(String(link.media_id||''))||String(link.media_id||'');
        if(uid&&byId.has(mediaId))attach(uid,mediaId);
      }
      let connected=0;
      const linkedUids=[...related.keys()];
      for(const row of await readExistingByIds(galaxy,'uid,media_link','uid',linkedUids,t('uiExtra.importUI.mediaLinkReadFailed'))){
          const uid=String(row.uid||'').trim();
          const prior=Array.isArray(row.media_link)?row.media_link.map(String):[];
          const after=[...new Set([...prior,...(related.get(uid)||[])])];
          if(after.length!==prior.length){await updateRows(galaxy,{media_link:after},{filters:[{column:'uid',operator:'eq',value:uid}]});connected++;}
      }

  return {created:createMedia.length,connected,resolvedIds};
}

function UniversalImport({scopeId,format,onFormatChange}) {
  const {locale}=useUiLocale();
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const nativeLocal=scopeId==='local'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios';
  const account=useAccount({enabled:!nativeLocal});
  const [fileName,setFileName]=useState('');
  const [archiveDetection,setArchiveDetection]=useState(null);
  const [archiveSummary,setArchiveSummary]=useState(null);
  const [archiveEvidence,setArchiveEvidence]=useState([]);
  const [rows,setRows]=useState([]);
  const [queue,setQueue]=useState([]);
  const [queueIndex,setQueueIndex]=useState(0);
  const [source,setSource]=useState('');
  const [importLocale,setImportLocale]=useState('zh-Hant');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const suggested=useMemo(()=>sourceSuggestion(fileName),[fileName]);
  const deferredSource=useDeferredValue(source);
  const analysisCurrent=deferredSource===source;
  const analyzed=useMemo(()=>{
    const selected=deferredSource.trim();
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,entry?.raw?.source_name||selected,format.fields,t));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      normalized:normalized.filter(item=>item.record),
      mediaOnly:normalized.filter(item=>item.mediaOnlyRecord).map(item=>item.mediaOnlyRecord),
      invalid:normalized.filter(item=>item.error)
    };
  },[rows,deferredSource,format.fields,locale]);
  if(!nativeLocal&&!account.canManageScopeSync(scopeId))return null;

  async function loadQueuedFile(file,index,total,language=importLocale,recordPath=format.recordPath){
    setFileName(file.name);setRows([]);setArchiveEvidence([]);setArchiveDetection(null);setArchiveSummary(null);setProgress(null);setStatus('');
    if(file.size>ARCHIVE_MAX_BYTES){
      setStatus(t('uiExtra.importUI.zipTooLarge'));
      return;
    }
    const firstBytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
    const isZip=/\.zip$/i.test(file.name)||(firstBytes[0]===80&&firstBytes[1]===75&&[3,5,7].includes(firstBytes[2]));
    const isThreadsJson=!isZip&&/\.json$/i.test(file.name)&&
      /(?:^|[-_. ])(?:threads|text_post_app_text_posts)(?:$|[-_. ])/i.test(file.name);
    setBusy(true);
    if(isZip)setStatus(t('uiExtra.importUI.zipInspecting'));
    try{
      if(isZip||isThreadsJson){
        // ZIP and standalone Threads JSON use the same structured scanner;
        // source names are only hints, each record must be a public post.
        const {detectZipArchiveSource,inspectPrivateArchive,zipEntryCount}=await import('./private-archive-universal.mjs');
        const totalEntries=isZip?await zipEntryCount(file):1;
        const result=isZip
          ?await detectZipArchiveSource(file,{skipPrivateEntries:!nativeLocal,onProgress:p=>setStatus('正在辨識 ZIP：已檢查 '+Number(p.filesSeen||0).toLocaleString()+' 個檔案…')})
          :{kind:'threads',sources:['threads'],confidence:1,
            evidence:[{source:'threads',path:file.name,verified:false}],structure:null,audit:null};
        setArchiveDetection(result);
        // Mixed ZIPs are classified per entry and each imported record is checked.
        // Inspect every supported source through the shared ZIP scanner.
        // Archive filename/structure picks an adapter; record content is authoritative.
        const imported=[],uidOwners=new Map(),exifSamples=[];
        const collector=createArchiveEvidenceCollector();
        let ignored=0,privateSkipped=0;
        const summary=await inspectPrivateArchive(file,{skipPrivateEntries:!nativeLocal,onProgress:p=>setStatus('正在解析 ZIP：'+(totalEntries!=null?'共 '+totalEntries.toLocaleString()+' 個檔案，':'')+'已檢查 '+Number(p.matchedFiles||0).toLocaleString()+' 個文字檔，找到 '+Number(p.acceptedRows||0).toLocaleString()+' 筆紀錄…'),onRecord:record=>{
          if(!nativeLocal&&!isPublicArchiveRecord(record)){
            ignored++;privateSkipped++;return;
          }
          const article=archiveGalaxyRow(record);
          // Media-only posts still carry URLs even when no Galaxy text exists.
          collector.onRecord(record,article?.uid||null);
          if(!article){ignored++;return;}
          const previous=uidOwners.get(article.uid);
          if(previous&&previous!==record.key)
            throw Error('來源紀錄 UID 雜湊衝突；沒有寫入資料庫。');
          uidOwners.set(article.uid,record.key);
          if(imported.length>=100000)
            throw Error('備份文字紀錄超過本次 100,000 筆安全上限，未匯入。');
          imported.push({raw:article,import_uid:article.uid});
        },onMediaMetadata:item=>{
          if(!nativeLocal&&isPrivateArchiveEntry(item.path))return;
          collector.onExif(item);
          if(exifSamples.length<5)exifSamples.push(item);
        },onMediaEntry:item=>{
          if(!nativeLocal&&isPrivateArchiveEntry(item.path))return;
          collector.onMediaEntry(item);
        }});
        // On a public Scope, EXIF must be traceable to an approved public post.
        // A loose photo in the ZIP can belong to a private chat even if its
        // path does not contain "messages".
        const mediaEvidence=collector.rows({scopeId,archiveName:file.name,archiveSize:file.size})
          .filter(item=>nativeLocal||(imported.length>0&&item.galaxy_uids?.some(uid=>uidOwners.has(uid))));
        setArchiveEvidence(mediaEvidence);
        setArchiveSummary({...summary,exifSamples,mediaEvidenceCount:mediaEvidence.length});
        if(!imported.length&&!mediaEvidence.length){
          setSource(result.sources.length===1?result.sources[0]:'');
          setStatus('ZIP 已讀取，但沒有可匯入的文字文章。已解析 '+summary.totalRows+
            ' 筆、略過 '+(summary.rejectedRows+ignored)+' 筆。'+
            (summary.problems.length?' 原因：'+summary.problems.slice(0,3).join('；'):' 請檢查資料格式。'));
          return;
        }
        setRows(imported);
        const sourceNames=[...new Set(imported.map(item=>item.raw.source_name))];
        setSource(sourceNames.length===1?sourceNames[0]:'Mixed');
        setStatus('已解析 '+imported.length.toLocaleString()+' 篇公開貼文，媒體 '+mediaEvidence.length.toLocaleString()+' 筆；略過 '+
          (ignored+summary.rejectedRows).toLocaleString()+' 筆'+
          (privateSkipped?'（含 '+privateSkipped.toLocaleString()+' 筆非公開／不支援紀錄）':'')+
          '。請核對預覽後，在「儲存至 Galaxy」按開始匯入。');
        return;
      }
      const {parseUniversalImportFile}=await import('./universal-file-import.mjs');
      const parsed=await parseUniversalImportFile(file,{recordPath,importLocale:language});
      const list=filterStandalonePublicRows(parsed,nativeLocal);
      assertStandaloneImportDestination({nativeLocal,fileName:file.name,rows:list});
      const prepared=list.map(row=>({
        raw:row,
        import_uid:createUid8()
      }));
      setRows(prepared);
      // Galaxy Markdown metadata suggests an initial source; the user may override it.
      setSource(String(list[0]?.source_name||'').trim()||sourceSuggestion(file.name));
      setStatus(t('uiExtra.importUI.parsedFile',{index:index+1,total,count:list.length.toLocaleString()})+
        (parsed.length!==list.length?'；已略過 '+(parsed.length-list.length).toLocaleString()+' 筆私人紀錄。':''));
    }catch(error){
      setRows([]);setArchiveEvidence([]);
      const wasBlocked=['LOC_PRIVATE_ARCHIVE_BLOCKED','LOC_UNVERIFIED_ARCHIVE_BLOCKED'].includes(error?.code);
      setStatus(wasBlocked
        ?'第 '+(index+1)+' 檔已阻止匯入：'+String(error?.message||error)+'；本次未寫入資料庫。'
        :t('uiExtra.importUI.parseFileFailed',{index:index+1,error:error?.message||error}));
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
    if(busy||(!rows.length&&!archiveEvidence.length))return;
    const selected=source.trim();
    if(!selected){setStatus(t('uiExtra.importUI.selectSource'));return;}
    if(!analyzed.valid.length&&!analyzed.mediaOnly.length&&!archiveEvidence.length){setStatus(t('uiExtra.importUI.noValidItems'));return;}
    try{
      if(archiveDetection){
        // The public-row guard, not the archive filename, controls publishing.
        if(!nativeLocal&&rows.some(item=>!['facebook','threads','instagram','x'].includes(String(item.raw?.source_name||'').toLowerCase())))
          throw new Error('公開網站的 ZIP 不允許匯入私人對話或無法辨識的紀錄。');
      }else assertStandaloneImportDestination({nativeLocal,fileName,rows,source});
    }
    catch(error){setStatus(String(error?.message||error));return;}
    setBusy(true);setStatus(t('uiExtra.importUI.checkingUids'));
    setProgress({completed:0,total:analyzed.valid.length+analyzed.mediaOnly.length,percent:0});
    try{
      const scope=nativeLocal?defaultScopeData('local'):account.scopeDataFor(scopeId);
      const galaxy=scope?.galaxy,galaxyMedia=scope?.galaxyMedia;
      if(!galaxy||!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      // Same Scope, same source, same actual second and comparable text
      // (punctuation, symbols, repeated newlines and spaces ignored).
      // The database is read only for matching seconds, never full-scanned.
      const incoming=dedupeIncomingImport(analyzed.valid);
      const unique=incoming.unique;
      let duplicateCount=incoming.duplicates;
      const existingUid=new Set();
      for(const row of await readExistingByIds(galaxy,'uid','uid',unique.map(record=>record.uid),t('uiExtra.importUI.existingUidFailed')))
        existingUid.add(String(row.uid||'').trim());
      // Exact-UID matches need no second database search at all.
      const toCompare=unique.filter(record=>!existingUid.has(record.uid));
      const existingBySameSecond=await findExistingImportDuplicates(toCompare,{
        readSeconds:async(source,seconds)=>{
          const or=seconds.map(second=>{
            const from=new Date(second*1000).toISOString();
            const to=new Date((second+1)*1000).toISOString();
            return 'and(createtime.gte.'+from+',createtime.lt.'+to+')';
          }).join(',');
          const collected=[];
          for(let start=0;;start+=MAX_ROWS){
            const relation=dbAuthRelation(galaxy)
              .select('uid,source_name,createtime,content')
              .ilike('source_name',source);
            // PostgREST executes one bounded OR query for 24 exact seconds.
            // Local adapters without .or use one bounded second at a time.
            if(typeof relation.or!=='function'){
              for(const second of seconds){
                for(let offset=0;;offset+=MAX_ROWS){
                  const from=new Date(second*1000).toISOString();
                  const to=new Date((second+1)*1000).toISOString();
                  const {data,error}=await dbAuthRelation(galaxy)
                    .select('uid,source_name,createtime,content').ilike('source_name',source)
                    .gte('createtime',from).lt('createtime',to).range(offset,offset+MAX_ROWS-1);
                  if(error)throw new Error('重複文章比對失敗：'+error.message);
                  collected.push(...(data||[]));
                  if((data||[]).length<MAX_ROWS)break;
                }
              }
              return collected;
            }
            const {data,error}=await relation.or(or).range(start,start+MAX_ROWS-1);
            if(error)throw new Error('重複文章比對失敗：'+error.message);
            collected.push(...(data||[]));
            if((data||[]).length<MAX_ROWS)break;
          }
          return collected;
        }
      });
      const payload=unique.filter(record=>!existingUid.has(record.uid)&&!existingBySameSecond.has(record.uid));
      duplicateCount+=unique.length-payload.length;
      const knownArticleIds=new Map();
      for(const record of analyzed.valid){
        const canonical=incoming.aliases.get(record.uid)||record.uid;
        knownArticleIds.set(record.uid,existingBySameSecond.get(canonical)||canonical);
      }
      await writeImportBatches(payload,{
        batchSize:MAX_ROWS,
        writeBatch:batch=>insertRows(galaxy,batch),
        onProgress:p=>setProgress({completed:p.completed,total:payload.length+analyzed.mediaOnly.length,percent:Math.round(100*p.completed/Math.max(1,payload.length+analyzed.mediaOnly.length))})
      });
      const archivePlan=prepareArchiveMedia(archiveEvidence,new Set(knownArticleIds.keys()));
      const canonicalArchiveMedia=archivePlan.media.map(record=>({
        ...record,galaxy_link:knownArticleIds.get(String(record.galaxy_link||''))||record.galaxy_link
      }));
      const mediaSummary=await syncImportedMedia({
        normalized:analyzed.normalized,
        mediaOnly:[...analyzed.mediaOnly,...canonicalArchiveMedia],
        extraLinks:archivePlan.mediaLinks,
        knownArticleIds,galaxy,galaxyMedia,t
      });
      let exifSaved=0;
      for(let offset=0;offset<archivePlan.exif.length;offset+=MAX_ROWS){
        const chunk=archivePlan.exif.slice(offset,offset+MAX_ROWS).map(row=>({
          ...row,media_id:mediaSummary.resolvedIds.get(row.media_id)||row.media_id
        }));
        const {data,error}=await dbAuthClient.schema('silver').rpc('save_archive_media_exif',{
          p_scope_id:scopeId,p_rows:chunk
        });
        if(error)throw new Error('媒體已儲存，但 EXIF 私人座標保存失敗：'+(error.message||error));
        if(Number(data)!==chunk.length)
          throw new Error('EXIF 資料庫寫入不完整：'+Number(data)+' / '+chunk.length);
        exifSaved+=chunk.length;
      }
      const skipped=analyzed.invalid.length+duplicateCount;
      setProgress({completed:payload.length+mediaSummary.created,total:payload.length+mediaSummary.created,percent:100});
      setStatus(t('uiExtra.importUI.importLinkedComplete',{articles:payload.length,media:mediaSummary.created,linked:mediaSummary.connected,skipped})+
        (archiveEvidence.length?'；EXIF 私人證據已儲存 '+exifSaved.toLocaleString()+' 筆。':''));
      setRows([]);setArchiveEvidence([]);
      if(nativeLocal)window.dispatchEvent(new Event('loc-local-data-changed'));
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
    {archiveSummary?<p className="scope-status" role="status">已檢查 {archiveSummary.mediaFiles.toLocaleString()} 個媒體檔；EXIF 解析 {archiveSummary.exifImages.toLocaleString()} 張，GPS {archiveSummary.exifWithGps.toLocaleString()} 筆，拍攝時間 {archiveSummary.exifWithTime.toLocaleString()} 筆，EXIF 略過 {archiveSummary.exifSkipped.toLocaleString()} 張。影像本體不儲存；媒體 URL／關聯會寫入 Galaxy Media，EXIF GPS／拍攝時間只存入私人證據資料，不能直接當作打卡地名。</p>:null}
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
    {rows.length||archiveEvidence.length?<section className="scope-import-save" aria-label={t('uiExtra.importUI.saveSection')}>
      <div>
        <h3>{t('uiExtra.importUI.saveSection')}</h3>
        <p>{t('uiExtra.importUI.saveHint')}</p>
      </div>
      <button type="button" className="loc-button scope-import-save-button"
        disabled={busy||!analysisCurrent||(!analyzed.valid.length&&!analyzed.mediaOnly.length&&!archiveEvidence.length)} onClick={run}>
        {busy?UI_COPY.management.importing:t('uiExtra.importUI.batchImport')}
      </button>
    </section>:null}
    {rows.length&&!busy&&!analysisCurrent?<p className="scope-status" role="status">正在更新匯入資料預覽，完成後才能開始匯入。</p>:null}
    {rows.length&&!busy&&analysisCurrent&&!analyzed.valid.length&&!analyzed.mediaOnly.length&&!archiveEvidence.length?<p className="scope-status" role="status">目前沒有可匯入的有效紀錄，請查看上方略過原因。</p>:null}
    {busy&&progress?.percent===100?<p className="scope-status" role="status">文章寫入已達 100%，仍在整理媒體與文章關聯；完成後才會解除處理中狀態。</p>:null}
    {progress?<div role="status" className="scope-import-progress">
      <progress value={progress.percent||0} max="100"/>
      <p><UiText id="uiExtra.importUI.writtenProgress" params={{completed:Number(progress.completed||0).toLocaleString(),total:Number(progress.total||0).toLocaleString(),percent:progress.percent||0}}/></p>
      {progress.total>0?<p className="scope-status">共 {Number(progress.total).toLocaleString()} 筆，每 MaxRows（{MAX_ROWS.toLocaleString()}）筆回報一次（第 {Math.max(1,Math.ceil(Number(progress.completed||0)/MAX_ROWS))} / {Math.max(1,Math.ceil(Number(progress.total)/MAX_ROWS))} 批）</p>:null}
    </div>:null}
    {pending&&!rows.length?<div className="scope-tabs"><button type="button" disabled={busy} onClick={nextFile}><UiText id="uiExtra.importUI.nextJson"/></button></div>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </div>;
}


export default function ManagementImportPanel({scopeId}){
  useUiSection('management');
  useUiSection('uiExtra.importUI');
  const [format,setFormat]=useState({recordPath:'',fields:{}});
  return <div className="scope-management-imports">
    <section className="loc-card scope-import-primary">
      <h2><UiText id="uiExtra.importUI.importTitle"/></h2>
      <UniversalImport scopeId={scopeId} format={format} onFormatChange={setFormat}/>
    </section>
  </div>;
}
