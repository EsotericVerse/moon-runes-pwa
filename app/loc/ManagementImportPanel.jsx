'use client';

import {useUiCopy,useUiLocale,useUiSection} from '../i18n/ui-locale';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection,UI_LOCALE_OPTIONS} from '../i18n/ui-copy';
import managementZh from '../i18n/sections/management.zh_tw.js';
import importUIZh from '../i18n/sections/uiExtra.importUI.zh_tw.js';
registerDefaultSection('management',managementZh);
registerDefaultSection('uiExtra.importUI',importUIZh);

import {useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import ScopeSourceCorrection from './ScopeSourceCorrection';
import {insertRows,dbAuthRelation,dbAuthClient,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {useAsyncResource} from './use-async-resource';
import {canonicalImportSourceName,inferImportSourceFromFilename} from './source-name.mjs';
import {Capacitor} from '@capacitor/core';
import {defaultScopeData} from './scope-data';
import {createUid8} from './uid';
import {facebookBackupPlace,facebookBackupPostText,facebookBackupTimestamp,facebookBackupImportUid} from './facebook-backup-place.mjs';
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {facebookArchiveUid} from './facebook-backup-place.mjs';
import {comparableImportText,dedupeIncomingImport,matchExistingImportByCreatedAt,matchExistingWithoutCreatedAt,matchMissingSiteImports,insertImportBatches} from './import-duplicate-check.mjs';
import {prepareImportPlaceAnchors,importedPlaceId} from './import-place-anchors.mjs';
import {extractImportCoordinates,importMapUrlCoordinates} from './import-geocoordinates.mjs';
import {isPublicArchiveRecord,isPrivateArchiveEntry,filterStandalonePublicRows,assertStandaloneImportDestination} from './archive-import-safety.mjs';
import {createArchiveEvidenceCollector,prepareArchiveMedia,isArchiveMediaUrl} from './archive-media-evidence.mjs';
import {ARCHIVE_MAX_BYTES,IMPORT_FIELD_ALIASES,UNIVERSAL_IMPORT_ACCEPT,mappedImportValue,normalizeImportMedia,parseImportCreatedTime,extractImportCreatedAt,writeImportBatches} from './import-batch.mjs';
import {MAX_ROWS,urlSafeInBatches} from './query-batch-size.mjs';
import {hasIrrecoverableEncoding,isPureUrlContent,normalizeGalaxyContent,normalizeRelationIds,repairMojibakeText,resolveGalaxyTitle} from './content-policy';
const ZIP_LAYOUT_KEYS=Object.freeze({
  'conversation-tree':'conversationTree','message-list':'messageList','post-list':'postList',
  activity:'activity',media:'media',table:'table','structured-records':'records',document:'document'
});
const ZIP_FIELD_KEYS=Object.freeze(['id','text','author','time','relation','attachment','collection']);
const ZIP_SOURCE_NAMES=Object.freeze({chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',grok:'Grok',copilot:'Microsoft Copilot',perplexity:'Perplexity', 'meta-ai':'Meta AI',facebook:'Facebook',messenger:'Messenger',instagram:'Instagram',threads:'Threads',whatsapp:'WhatsApp',x:'X / Twitter',telegram:'Telegram',discord:'Discord',line:'LINE',slack:'Slack',teams:'Microsoft Teams',snapchat:'Snapchat',wechat:'WeChat',tiktok:'TikTok',reddit:'Reddit',linkedin:'LinkedIn',pinterest:'Pinterest',youtube:'YouTube','google-takeout':'Google Takeout'});
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
  // belongs in Galaxy.location; never stringify [object Object].
  const mappedPlace=value('location');
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
  const importedCoordinates=place?extractImportCoordinates(row.__importCoordinates||row):null;
  const rawDate=value('createtime')||
    (isThreads?row.media?.find?.(item=>item?.creation_timestamp)?.creation_timestamp:null)||
    (isFacebook?facebookBackupTimestamp(row):null);
  const createdAt=parseImportCreatedTime(rawDate)||extractImportCreatedAt(row);
  const nativeThreadsId=isThreads?String(row.id||row.post_id||row.thread_id||'').trim():'';
  const stableThreadsKey=isThreads&&(nativeThreadsId||createdAt&&comparableImportText(content))
    ?'threads:json:'+JSON.stringify([nativeThreadsId||null,createdAt,comparableImportText(content)]):'';
  const uid=String(value('uid')||(isFacebook?facebookBackupImportUid(row):stableThreadsKey?facebookArchiveUid(stableThreadsKey):entry?.import_uid||createUid8())).trim();
  const rawUrl=String(value('url')||'').trim();
  const mediaCandidates=[value('media'),value('media_link'),
    ...(isArchiveMediaUrl(rawUrl)?[rawUrl]:[])]
    .filter(item=>item!==''&&item!==undefined&&item!==null);
  let mediaRecords=[],mediaRefs=[];
  try{
    for(const item of mediaCandidates){
      const media=normalizeImportMedia(item,{title:rawTitle,createtime:createdAt,location:sourcePlace,article_uid:uid});
      mediaRecords.push(...media.records);
      mediaRefs.push(...media.references);
    }
    const seenMediaKeys=new Set();
    mediaRecords=mediaRecords.filter(record=>{
      const key=record.uid?'id:'+record.uid:(record.url?JSON.stringify([record.url,record.media_type]):null);
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
      const rawId=String(row.uid||'').trim();
      if(rawId&&!/^[A-Z0-9]{8}$/i.test(rawId))return {record:null,error:t('uiExtra.importUI.invalidMediaId')};
      return {record:null,error:'',mediaOnlyRecord:{
        ...(rawId?{uid:rawId}:{}),
        __article_uid:String(value('galaxy_link')||'').trim()||null,
        location:sourcePlace||null,
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
    // Threads has no native post title; titleless imports use the first 10 Unicode characters.
    title:(isThreads||!rawTitle)?Array.from(content).slice(0,10).join(''):resolveGalaxyTitle(rawTitle,content),
    content,
    createtime:createdAt,
    location:sourcePlace||null,
    ...(importedCoordinates?{__importCoordinates:importedCoordinates}:{}),
    searchable,
    statistics_able:value('statistics_able')===false||String(value('statistics_able')).toLowerCase()==='false'||!searchable?false:!isPureUrlContent(content),
    source_id:String(value('source_id')||'').trim()||null,
    target_id:normalizeRelationIds(value('target_id')),
    ref_id:String(value('ref_id')||'').trim()||null,
    url:!isArchiveMediaUrl(rawUrl)&&!importMapUrlCoordinates(rawUrl)?rawUrl||null:null,
    ...(mediaRefs.length?{media_link:mediaRefs}:{}),
    site:String(source||'').trim()
  };
  return {record,mediaRecords,mediaRefs,error:''};
}

const IMPORT_FORMAT_FIELDS=Object.freeze([
  'uid','content','title','createtime','location',
  'url','source_id','target_id','ref_id','searchable','statistics_able',
  'media_link','media','media_type','galaxy_link','meta_tags','rune_references'
]);

function ImportFormatSettings({format,onChange,disabled=false}){
  const t=useUiText();
  const update=(key,value)=>onChange({...format,[key]:value});
  const updateField=(key,value)=>onChange({...format,fields:{...format.fields,[key]:value}});
  return <details className="loc-bubble scope-import-format">
    <summary><UiText id="uiExtra.importUI.formatSummary"/><span className="scope-import-format-mark" aria-hidden="true"/></summary>
    <div className="scope-management-fields">
      <label><UiText id="uiExtra.importUI.recordPath"/>
        <input disabled={disabled} value={format.recordPath} onChange={e=>update('recordPath',e.target.value)} placeholder={t('uiExtra.importUI.recordPathHint')}/>
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

// A GET .in() filter has a URL budget, unlike POST imports.
// Count and page each query until all matched rows are returned.
async function readExistingByIds(table,columns,column,values,message){
  const records=[],orderColumn=table.endsWith('_media')?'uid':'uid';
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
        return (owner?(item.mediaRecords||[]):[]).map(record=>({...record,__article_uid:owner}));
      }).concat(mediaOnly);
      const existingMedia=[];
      const explicitIds=[...new Set([...plans.map(record=>record.uid).filter(Boolean),...normalized.flatMap(item=>item.mediaRefs||[])])];
      existingMedia.push(...await readExistingByIds(galaxyMedia,'uid,url,media_type','uid',explicitIds,t('uiExtra.importUI.mediaIdCompareFailed')));
      // Reuse matching media URLs across articles without duplicating media rows.
      const candidateUrls=[...new Set(plans.map(row=>row.url).filter(Boolean))];
      existingMedia.push(...await readExistingByIds(galaxyMedia,'uid,url,media_type','url',candidateUrls,t('uiExtra.importUI.mediaUrlCompareFailed')));
      const mediaKey=row=>{
        const url=String(row.url||'').trim();
        return url?JSON.stringify([url,String(row.media_type||'').trim()])
          :(row.uid?'id:'+row.uid:null);
      };
      const byKey=new Map(existingMedia.map(row=>[mediaKey(row),row]).filter(([key])=>key));
      const byId=new Map(existingMedia.map(row=>[String(row.uid),row]));
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
        const owner=String(raw.__article_uid||'').trim();
        const record={...raw};delete record.__article_uid;
        const key=mediaKey(record);
        const known=(record.uid?byId.get(String(record.uid)):null)||(key?byKey.get(key):null);
        if(known){if(record.uid)resolvedIds.set(String(record.uid),String(known.uid));attach(owner,known.uid);continue;}
        if(key&&seenMedia.has(key))continue;
        if(key)seenMedia.add(key);
        const mediaId=record.uid||createUid8();
        if(!mediaId)throw new Error(t('uiExtra.importUI.mediaUuidUnavailable'));
        record.uid=mediaId;
        createMedia.push(record);if(key)byKey.set(key,record);byId.set(mediaId,record);
        attach(owner,mediaId);
      }
      await writeImportBatches(createMedia,{
        batchSize:MAX_ROWS,
        writeBatch:batch=>insertRows(galaxyMedia,batch)
      });
      for(const link of extraLinks){
        const uid=knownArticleIds.get(String(link.uid||'').trim());
        const mediaId=resolvedIds.get(String(link.media_uid||''))||String(link.media_uid||'');
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
  const sourceCategories=useAsyncResource({
    queryKey:['import-source-categories',scopeId],
    enabled:!nativeLocal&&Boolean(account.user)&&account.canManageScopeSync(scopeId),
    queryFn:async()=>{
      const lists=await Promise.all(['loc',scopeId].map(async id=>{
        const {data,error}=await dbAuthRelation('silver.'+id).select('txt_class').eq('id',id).maybeSingle();
        if(error)throw new Error(error.message);
        return Array.isArray(data?.txt_class)?data.txt_class:[];
      }));
      return {system:lists[0],personal:lists[1]};
    }
  });
  const sourceOptions=[...new Set([...(sourceCategories.data?.system||[]),...(sourceCategories.data?.personal||[])])];
  const canonicalSource=value=>canonicalImportSourceName(value,sourceCategories.data?.system||[],sourceCategories.data?.personal||[]);
  const [importLocale,setImportLocale]=useState('zh-Hant');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const suggested=useMemo(()=>inferImportSourceFromFilename(fileName),[fileName]);
  const deferredSource=useDeferredValue(source);
  const analysisCurrent=deferredSource===source;
  const analyzed=useMemo(()=>{
    const selected=deferredSource.trim();
    const normalized=rows.map(entry=>normalizeJsonImportEntry(entry,
      canonicalImportSourceName(archiveDetection&&selected==='Mixed'?(entry?.raw?.site||selected):selected,
        sourceCategories.data?.system||[],sourceCategories.data?.personal||[]),format.fields,t));
    return {
      valid:normalized.filter(item=>item.record).map(item=>item.record),
      normalized:normalized.filter(item=>item.record),
      mediaOnly:normalized.filter(item=>item.mediaOnlyRecord).map(item=>item.mediaOnlyRecord),
      invalid:normalized.filter(item=>item.error)
    };
  },[rows,deferredSource,format.fields,locale,archiveDetection,sourceCategories.data]);
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
        const summary=await inspectPrivateArchive(file,{skipPrivateEntries:!nativeLocal,onProgress:p=>setStatus('正在解析 ZIP：'+(totalEntries!=null?'ZIP 共 '+totalEntries.toLocaleString()+' 個項目，':'')+'已掃描 '+Number(p.filesSeen||0).toLocaleString()+' 個檔案；其中 JSON '+Number(p.jsonFilesSeen||0).toLocaleString()+' 個，完成解析 '+Number(p.jsonFilesParsed||0).toLocaleString()+' 個；取得 '+Number(p.acceptedRows||0).toLocaleString()+' 筆紀錄…'),onRecord:record=>{
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
          .filter(item=>nativeLocal||item.referenced_by_post||(imported.length>0&&item.galaxy_uids?.some(uid=>uidOwners.has(uid))));
        const mediaPlan=prepareArchiveMedia(mediaEvidence,new Set(uidOwners.keys()));
        setArchiveEvidence(mediaEvidence);
        setArchiveSummary({...summary,exifSamples,
          mediaEvidenceCount:mediaEvidence.length,
          mediaImportable:mediaPlan.media.length,
          mediaWithUrl:mediaPlan.media.filter(item=>Boolean(item.url)).length,
          mediaLinked:mediaEvidence.filter(item=>item.galaxy_uids?.length).length,
          mediaUnlinked:mediaPlan.media.filter(item=>!item.__article_uid).length});
        if(!imported.length&&!mediaEvidence.length){
          setSource(result.sources.length===1?canonicalSource(result.sources[0]):'');
          setStatus('ZIP 已讀取，但沒有可匯入的文字文章。已解析 '+summary.totalRows+
            ' 筆、略過 '+(summary.rejectedRows+ignored)+' 筆。'+
            (summary.problems.length?' 原因：'+summary.problems.slice(0,3).join('；'):' 請檢查資料格式。'));
          return;
        }
        setRows(imported);
        const sourceNames=[...new Set(imported.map(item=>item.raw.site))];
        setSource(sourceNames.length===1?canonicalSource(sourceNames[0]):'Mixed');
        setStatus('已解析 '+imported.length.toLocaleString()+' 篇公開貼文；ZIP 媒體檔 '+summary.mediaFiles.toLocaleString()+
          ' 個、可匯入媒體 '+mediaPlan.media.length.toLocaleString()+' 筆（有網址 '+mediaPlan.media.filter(item=>item.url).length.toLocaleString()+' 筆）；略過 '+
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
      // Use the filename as the default source; Scope editors may override it.
      setSource(canonicalSource(inferImportSourceFromFilename(file.name)));
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
    const selected=canonicalSource(source);
    if(!selected){setStatus(t('uiExtra.importUI.selectSource'));return;}
    if(!analyzed.valid.length&&!analyzed.mediaOnly.length&&!archiveEvidence.length){setStatus(t('uiExtra.importUI.noValidItems'));return;}
    try{
      if(archiveDetection){
        // The public-row guard, not the archive filename, controls publishing.
        if(!nativeLocal&&rows.some(item=>!['facebook','threads','instagram','x'].includes(String(item.raw?.site||'').toLowerCase())))
          throw new Error('公開網站的 ZIP 不允許匯入私人對話或無法辨識的紀錄。');
      }else assertStandaloneImportDestination({nativeLocal,fileName,rows,source});
    }
    catch(error){setStatus(String(error?.message||error));return;}
    setBusy(true);setStatus(t('uiExtra.importUI.checkingCreatedAt'));
    setProgress({completed:0,total:analyzed.valid.length+analyzed.mediaOnly.length,percent:0});
    try{
      const scope=nativeLocal?defaultScopeData('local'):account.scopeDataFor(scopeId);
      const galaxy=scope?.galaxy,galaxyMedia=scope?.galaxyMedia;
      if(!galaxy||!galaxyMedia)throw new Error(t('uiExtra.importUI.scopeUnresolved'));
      // Reimport identity: source creation time, not freshly minted Galaxy uid.
      // Unknown source time is null and never causes an import-time lookup.
      const incoming=dedupeIncomingImport(analyzed.valid);
      // Photo EXIF remains separate media evidence, never a post check-in location.
      const unique=incoming.unique;
      let duplicateCount=incoming.duplicates;
      const existingByCreatedAt=await matchExistingImportByCreatedAt(unique,{
        readSeconds:async(source,seconds)=>{
          const or=seconds.map(second=>{
            const from=new Date(second*1000).toISOString();
            const to=new Date((second+1)*1000).toISOString();
            return 'and(createtime.gte.'+from+',createtime.lt.'+to+')';
          }).join(',');
          const collected=[];
          for(let start=0;;){
            const relation=dbAuthRelation(galaxy)
              .select('uid,site,createtime,content,title,location,place_id',{count:'exact'})
              .ilike('site',source);
            // PostgREST executes one bounded OR query for 24 exact seconds.
            // Local adapters without .or use one bounded second at a time.
            if(typeof relation.or!=='function'){
              for(const second of seconds){
                for(let offset=0;;){
                  const from=new Date(second*1000).toISOString();
                  const to=new Date((second+1)*1000).toISOString();
                  const {data,error,count}=await dbAuthRelation(galaxy)
                    .select('uid,site,createtime,content,title,location,place_id',{count:'exact'}).ilike('site',source)
                    .gte('createtime',from).lt('createtime',to).range(offset,offset+MAX_ROWS-1);
                  if(error)throw new Error('重複文章比對失敗：'+error.message);
                  collected.push(...(data||[]));
                  offset+=(data||[]).length;
                  if(!(data||[]).length||(count!=null&&offset>=Number(count)))break;
                }
              }
              return collected;
            }
            const {data,error,count}=await relation.or(or).order('uid',{ascending:true}).range(start,start+MAX_ROWS-1);
            if(error)throw new Error('重複文章比對失敗：'+error.message);
            collected.push(...(data||[]));
            start+=(data||[]).length;
            if(!(data||[]).length||(count!=null&&start>=Number(count)))break;
          }
          return collected;
        }
      });
      // Incomplete Threads/Meta backups can omit createdAt. Reimport must
      // look for already stored posts with the same site and complete article
      // metadata, not blindly INSERT another null-time copy.
      const missingTime=unique.filter(record=>!existingByCreatedAt.has(record.uid)&&
        (record.createtime==null||record.createtime==='')&&
        String(record.site||'').trim()&&String(record.content||'').trim());
      if(missingTime.length){
        const matched=await matchExistingWithoutCreatedAt(missingTime,{
          readContents:async(source,contents)=>{
            const collected=[];
            // Bound GET URLs. An exceptionally long text is still importable,
            // even when its exact-content lookup exceeds REST URL limits.
            const safeContents=contents.filter(value=>{
              try{return encodeURIComponent(value).length<=5000;}
              catch{return false;}
            });
            for(const batch of urlSafeInBatches(safeContents,'content')){
              for(let offset=0;;){
                const {data,error,count}=await dbAuthRelation(galaxy)
                  .select('uid,site,createtime,title,content,location,place_id,url,source_id,target_id,ref_id,media_link,searchable,statistics_able,date',{count:'exact'})
                  .ilike('site',source).in('content',batch)
                  .order('uid',{ascending:true}).range(offset,offset+MAX_ROWS-1);
                if(error)throw new Error('無時間文章比對失敗：'+error.message);
                const rows=data||[];
                collected.push(...rows);
                offset+=rows.length;
                if(!rows.length||(count!=null&&offset>=Number(count))||rows.length<MAX_ROWS)break;
              }
            }
            return collected;
          }
        });
        for(const [newUid,existing] of matched)existingByCreatedAt.set(newUid,existing);
      }
      // Older imports sometimes have no site. Timestamp alone is not enough
      // to infer an author/platform: require identical normalized content and
      // an unambiguous matching row before repairing that missing site.
      const unmatchedWithTime=unique.filter(record=>!existingByCreatedAt.has(record.uid)&&
        String(record.site||'').trim()&&record.createtime&&Number.isFinite(Date.parse(record.createtime)));
      if(unmatchedWithTime.length){
        let earliest=Infinity,latest=-Infinity;
        for(const record of unmatchedWithTime){
          const ms=Date.parse(record.createtime);
          earliest=Math.min(earliest,ms);latest=Math.max(latest,ms);
        }
        const from=new Date(Math.floor(earliest/1000)*1000).toISOString();
        const through=new Date((Math.floor(latest/1000)+1)*1000).toISOString();
        const unknownSiteRows=[];
        for(const [method,term] of [['is',null],['eq','']]){
          for(let offset=0;;){
            const {data,error,count}=await dbAuthRelation(galaxy)
              .select('uid,site,createtime,content,title,location,place_id',{count:'exact'})
              .gte('createtime',from).lt('createtime',through)
              [method]('site',term).order('uid',{ascending:true})
              .range(offset,offset+MAX_ROWS-1);
            if(error)throw new Error('補寫空白 site 的比對失敗：'+error.message);
            const page=data||[];
            unknownSiteRows.push(...page);
            offset+=page.length;
            if(!page.length||(count!=null&&offset>=Number(count))||page.length<MAX_ROWS)break;
          }
        }
        const missingSiteMatches=matchMissingSiteImports(unmatchedWithTime,unknownSiteRows,existingByCreatedAt);
        for(const [newUid,existing] of missingSiteMatches)existingByCreatedAt.set(newUid,existing);
      }
      // Importing an original check-in also restores its spatial anchor.
      // The Timeline importer remains supplemental and does not run here.
      const placeAnchors=await prepareImportPlaceAnchors(unique,{
        scopeId,relation:dbAuthRelation,allowMissing:true
      });
      const knownArticleIds=new Map();
      let updated=0;
      for(const record of unique){
        const existing=existingByCreatedAt.get(record.uid);
        if(!existing){knownArticleIds.set(record.uid,record.uid);continue;}
        knownArticleIds.set(record.uid,String(existing.uid));
        const changes={};
        if(String(existing.title||'')!==String(record.title||''))changes.title=record.title;
        if(String(existing.content||'')!==String(record.content||''))changes.content=record.content;
        if(record.__importCoordinates&&!String(existing.location||'').trim()&&String(record.location||'').trim())
          changes.location=record.location;
        if(!String(existing.site||'').trim()&&String(record.site||'').trim())
          changes.site=record.site;
        const placeUid=importedPlaceId({incoming:record,existing,byCoordinate:placeAnchors.byCoordinate});
        if(placeUid)changes.place_id=placeUid;
        // Do not replace a manually selected location or existing place_id.
        if(Object.keys(changes).length){
          await updateRows(galaxy,changes,{filters:[{column:'uid',operator:'eq',value:existing.uid}]});
          updated++;
        }
      }
      for(const record of analyzed.valid){
        const canonical=incoming.aliases.get(record.uid)||record.uid;
        knownArticleIds.set(record.uid,knownArticleIds.get(canonical)||canonical);
      }
      const payload=unique.filter(record=>!existingByCreatedAt.has(record.uid)).map(record=>{
        const placeUid=importedPlaceId({incoming:record,byCoordinate:placeAnchors.byCoordinate});
        const {__importCoordinates:unusedCoordinates,...article}=record;
        return placeUid?{...article,place_id:placeUid}:article;
      });
      const result=await insertImportBatches(payload,{
        batchSize:MAX_ROWS,
        writeBatch:batch=>insertRows(galaxy,batch),
        onProgress:p=>setProgress({completed:p.completed,total:payload.length+analyzed.mediaOnly.length,
          percent:Math.round(100*p.completed/Math.max(1,payload.length+analyzed.mediaOnly.length))})
      });
      duplicateCount+=result.conflicts;
      const archivePlan=prepareArchiveMedia(archiveEvidence,new Set(knownArticleIds.keys()));
      const canonicalArchiveMedia=archivePlan.media.map(record=>({
        ...record,__article_uid:knownArticleIds.get(String(record.__article_uid||''))||record.__article_uid
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
          ...row,media_uid:mediaSummary.resolvedIds.get(row.media_uid)||row.media_uid
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
      setProgress({completed:result.inserted+updated+mediaSummary.created,total:result.inserted+updated+mediaSummary.created,percent:100});
      setStatus(t('uiExtra.importUI.importLinkedComplete',{articles:result.inserted,media:mediaSummary.created,linked:mediaSummary.connected,skipped})+
        '；已更新既有文章 '+updated.toLocaleString()+' 筆，新增定錨點 '+placeAnchors.created.toLocaleString()+' 筆，沿用定錨點 '+placeAnchors.reused.toLocaleString()+' 筆。'+(archiveEvidence.length?'；EXIF 私人證據已儲存 '+exifSaved.toLocaleString()+' 筆。':''));
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
    <label className="scope-import-source-choice"><UiText id="uiExtra.importUI.sourceLabel"/>
      <input type="text" list={'scope-import-sources-'+scopeId} maxLength={80} required
        value={source} onChange={event=>setSource(event.target.value)}
        disabled={busy||!rows.length} placeholder={suggested}/>
      <datalist id={'scope-import-sources-'+scopeId}>
        {sourceOptions.map(name=><option key={name} value={name}/>)}
      </datalist>
    </label>
    <ImportFormatSettings format={format} onChange={changeImportFormat} disabled={busy}/>
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
    {archiveDetection?.fileInventory?<p className="scope-status" role="status">
      ZIP 完整清點：{archiveDetection.fileInventory.allFiles.toLocaleString()} 個檔案，其中 JSON {archiveDetection.fileInventory.jsonFiles.toLocaleString()} 個（私人對話候選 JSON {archiveDetection.fileInventory.privateJsonFiles.toLocaleString()} 個）。前面的資料結構辨識是抽樣，不代表只掃描這些檔案。
    </p>:null}
    {archiveSummary?<p className="scope-status" role="status">
      JSON 核對：共 {archiveSummary.jsonFilesSeen.toLocaleString()} 個；完成解析 {archiveSummary.jsonFilesParsed.toLocaleString()}、私人對話排除 {archiveSummary.jsonFilesPrivate.toLocaleString()}、格式未辨識 {archiveSummary.jsonFilesUnrecognized.toLocaleString()}、檔案過大 {archiveSummary.jsonFilesOversize.toLocaleString()}、其他不支援 {archiveSummary.jsonFilesUnsupported.toLocaleString()}。
      {archiveDetection?.fileInventory&&archiveDetection.fileInventory.jsonFiles!==archiveSummary.jsonFilesSeen?' ZIP 清點與解析掃描的 JSON 總數不一致，請先核對來源檔案。':''}
      {archiveSummary.jsonFilesSeen!==archiveSummary.jsonFilesParsed+archiveSummary.jsonFilesPrivate+archiveSummary.jsonFilesUnrecognized+archiveSummary.jsonFilesOversize+archiveSummary.jsonFilesUnsupported?' JSON 數量尚未完全對帳，請勿視為完整匯入。':''}
      原始紀錄 {archiveSummary.totalRows.toLocaleString()} 筆，解析接受 {archiveSummary.acceptedRows.toLocaleString()} 筆，解析拒絕 {archiveSummary.rejectedRows.toLocaleString()} 筆；解析接受不等於最終寫入成功。
    </p>:null}
    {archiveSummary?<p className="scope-status" role="status">已檢查 {archiveSummary.mediaFiles.toLocaleString()} 個媒體檔；與文章關聯 {archiveSummary.mediaLinked.toLocaleString()} 筆，可寫入 Galaxy Media {archiveSummary.mediaImportable.toLocaleString()} 筆（具公開網址 {archiveSummary.mediaWithUrl.toLocaleString()} 筆、無文章關聯 {archiveSummary.mediaUnlinked.toLocaleString()} 筆）。嘗試讀取 EXIF {archiveSummary.exifImages.toLocaleString()} 張，GPS {archiveSummary.exifWithGps.toLocaleString()} 筆，拍攝時間 {archiveSummary.exifWithTime.toLocaleString()} 筆，略過 {archiveSummary.exifSkipped.toLocaleString()} 張。沒有 EXIF 不影響已確認關聯的媒體；沒有公開網址的媒體只保留資料與關聯，不會顯示可開啟的圖片連結。</p>:null}
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
    <ScopeSourceCorrection scopeId={scopeId}/>
    <section className="loc-card scope-import-primary">
      <h2><UiText id="uiExtra.importUI.importTitle"/></h2>
      <UniversalImport scopeId={scopeId} format={format} onFormatChange={setFormat}/>
    </section>
  </div>;
}
