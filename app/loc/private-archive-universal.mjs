// LOC's shared, offline, multi-source archive inspection engine.
// Never uploads contents. zip.js-like mature primitives: fflate for ZIP; @streamparser/json for JSON.
// Unsupported formats are explicitly accounted for; no speculative field coercion.
import {Unzip,UnzipInflate,UnzipPassThrough} from 'fflate';
import {ARCHIVE_MAX_BYTES,ARCHIVE_JSON_MAX_BYTES} from './import-batch.mjs';
export {ARCHIVE_MAX_BYTES};
import {JSONParser} from '@streamparser/json';
import {archiveEntrySignatures,summarizeArchiveSources} from './archive-source-signatures.mjs';
import {inspectArchiveEntryStructure,summarizeArchiveStructures} from './archive-structure-inspector.mjs';
import {createArchiveCompletenessAudit} from './archive-completeness-audit.mjs';
import {canonicalArchiveText} from './archive-record-identity.mjs';
import {facebookBackupPlace,facebookBackupTimestamp} from './facebook-backup-place.mjs';
import {IMAGE_EXIF_PREFIX_LIMIT,readImageExif} from './archive-exif.mjs';

export const ARCHIVE_CHUNK_BYTES=128*1024;
// Reject oversized archives before reading any bytes. Only approved entries are inflated.
const MAX_EXTRACTED=100*1024*1024;
// Large Meta backups may contain tens of thousands of *ignored* media entries.
// Count entries but never decompress ignored media; retain a finite ZIP entry cap.
const MAX_FILES=100000,MAX_TEXT_DOCUMENT=8*1024*1024;
const MAX_STRUCTURED_DOCUMENT=ARCHIVE_JSON_MAX_BYTES;
const MAX_SNIFF_INFLATE=2*1024*1024;
const YTD=/^\s*(?:\/\*[\s\S]*?\*\/\s*)?window\.YTD\.[\w-]+\.part\d+\s*=\s*/;
const textExtension=/\.(?:json|js|txt|md|csv|tsv|html?|xml|log|jsonl)$/i;
const exifImage=/\.(?:jpe?g|png)$/i;
const mediaExtension=/\.(?:jpe?g|png|gif|webp|heic|bmp|avif|tiff?|mp4|mov|avi|mkv|webm|m4v|pdf|mp3|ogg|wav|flac|m4a|aac|zip|7z|rar|tar|gz|woff2?|svg|ico|exe|dll|bin|sqlite|db)$/i;
const SKIP_ZIP_BYTES=new Uint8Array(0);
const skippedZipEntry=path=>!path||path.endsWith('/')||path.split('/').some(part=>part==='..'||part==='__MACOSX')||!textExtension.test(path)||mediaExtension.test(path);
// Do not inflate or even buffer ignored compressed entries: fflate buffers an
// unstarted entry, so drain its *compressed bytes* through a no-op decoder.
function discardZipEntry(unzip,entry){
  const compression=entry.compression;
  class DiscardDecoder{
    static compression=compression;
    ondata;
    push(_bytes,final){if(final)this.ondata?.(null,SKIP_ZIP_BYTES,true);}
  }
  unzip.register(DiscardDecoder);
  entry.ondata=error=>{if(error)throw error;};
  entry.start();
  if(compression===8)unzip.register(UnzipInflate);
  else if(compression===0)unzip.register(UnzipPassThrough);
}
const weirdText=/\ufffd|(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|ä¸|å¤)/;
const aborted=signal=>{if(signal?.aborted)throw new Error('已取消本機解析。');};
const iso=value=>{
  if(value===undefined||value===null||value==='')return null;
  const numeric=typeof value==='number'?value:typeof value==='string'&&/^\d{10,13}$/.test(value)?Number(value):null;
  const epoch=numeric===null?Date.parse(String(value)):numeric>100000000000?numeric:numeric*1000;
  return Number.isFinite(epoch)?new Date(epoch).toISOString():null;
};
const hash=text=>{
  // Stable, non-cryptographic archive identity hint. Content conflicts are still checked.
  let a=2166136261,b=2166136261;
  for(let i=0;i<text.length;i++){
    a=Math.imul(a^text.charCodeAt(i),16777619);
    b=Math.imul(b^text.charCodeAt(i),2246822519);
  }
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
};
const cleanPath=value=>String(value||'').replace(/\\/g,'/').replace(/^\/+/, '');
const category=path=>{
  const p=cleanPath(path).toLowerCase();
  if(/\bthreads\b|threads_and_replies|threads_posts/.test(p))return 'threads';
  if(/instagram|your_instagram_activity|ig_posts/.test(p))return 'instagram';
  if(/facebook|your_facebook_activity|posts\/your_posts|status_updates/.test(p))return 'facebook';
  if(/twitter|\bx\/|tweets?\.js|note.tweets/.test(p))return 'x';
  return 'meta';
};
const txt=value=>typeof value==='string'?value:null;
const pickUrl=item=>[item.url,item.permalink,item.link,item.post_url,item.string_map_data?.Permalink?.value,
  item.string_map_data?.Link?.value].find(v=>typeof v==='string'&&/^https?:\/\//i.test(v.trim()))||'';
function chatgptConversation(row){
  if(!row||typeof row!=='object'||!row.mapping)return null;
  const messages=Object.values(row.mapping).map(node=>node?.message).filter(Boolean)
    .map(message=>{
      const parts=message.content?.parts||message.content?.text;
      const content=Array.isArray(parts)?parts.filter(v=>typeof v==='string').join('\n'):
        typeof parts==='string'?parts:'';
      return {content,role:String(message.author?.role||'unknown'),time:Number(message.create_time)||0};
    }).filter(item=>item.content.trim()).sort((a,b)=>a.time-b.time);
  return messages.length?messages.map(item=>'['+item.role+']\n'+item.content).join('\n\n'):null;
}
function extractCaption(item){
  const a=item?.title??item?.caption??item?.text??item?.content??item?.description??
    item?.post??item?.body??item?.value??item?.string_map_data?.Text?.value;
  if(typeof a==='string')return a;
  if(Array.isArray(a))return a.map(v=>txt(v?.text)||txt(v?.value)||'').filter(Boolean).join('\n')||null;
  if(typeof item?.data?.[0]?.post==='string')return item.data[0].post;
  if(Array.isArray(item?.data)){
    const parts=item.data.map(v=>txt(v?.post)||txt(v?.text)||'').filter(Boolean);
    if(parts.length)return parts.join('\n');
  }
  if(Array.isArray(item?.media))return item.media.map(v=>txt(v?.title)).filter(Boolean).join('\n')||null;
  return null;
}
function normalize(row,{platform,kind,path,index,conversation}){
  if(!row||typeof row!=='object'||Array.isArray(row))return {error:'非物件資料'};
  const item=row?.tweet||row?.noteTweet?row.tweet||row.noteTweet:row;
  const actualKind=kind==='auto'? (item.sender_name||item.timestamp_ms?'message':'post'):kind;
  const sender=txt(item.sender_name)||txt(item.username)||txt(item.author?.username)||
    txt(item.actor)||txt(item.user?.name)||null;
  const data=item.string_map_data||{};
  const chatText=platform==='chatgpt'?chatgptConversation(item):null;
  const text=chatText||(platform==='x'?(txt(item.full_text)||txt(item.core?.text)||txt(item.text)):
    actualKind==='message'?(txt(item.content)||txt(item.text)||null):
    actualKind==='post'?(extractCaption(item)||txt(data['Title']?.value)||null):
    extractCaption(item));
  const sourcePlace=platform==='facebook'&&actualKind==='post'?facebookBackupPlace(item):'';
  const attachments=[
    ...(Array.isArray(item.photos)?item.photos:[]),
    ...(Array.isArray(item.videos)?item.videos:[]),
    ...(Array.isArray(item.audio_files)?item.audio_files:[]),
    ...(Array.isArray(item.attachments)?item.attachments:[]),
    ...(Array.isArray(item.media)?item.media:[]),
    ...(item.uri?[{uri:item.uri}]:[])
  ].map(v=>({uri:txt(v?.uri)||txt(v?.media?.uri)||null})).filter(v=>v.uri).slice(0,200);
  if(kind==='message'&&text===null&&!attachments.length)
    return {error:'訊息沒有文字或可辨識附件'};
  if(kind==='post'&&text===null&&!attachments.length&&!sourcePlace)
    return {error:'貼文沒有可辨識文字、打卡地點或附件'};
  // A previously unseen Meta schema is retained as explicitly unmapped JSON,
  // never silently presented as a successfully mapped post or message.
  const unmapped=!text&&!attachments.length&&!sourcePlace;
  const finalKind=unmapped?'unmapped':actualKind;
  const visibleText=unmapped?JSON.stringify(row):text||'';
  const native=String(item.id_str||item.id||item.post_id||item.conversation_id||item.media_id||
    item.noteTweetId||item.uri||'');
  const timestamp=item.create_time??item.timestamp_ms??item.timestamp??item.creation_timestamp??
    item.taken_at??item.created_at??item.createdAt??item.date??item.core?.createdAt??
    item.string_map_data?.['Creation Time']?.timestamp??
    (platform==='facebook'&&actualKind==='post'?facebookBackupTimestamp(item):null);
  const createdAt=iso(timestamp);
  const originalTimestamp=timestamp===undefined?'':String(timestamp);
  const relative=cleanPath(path).replace(/^.*?(?=messages\/)/i,'');
  const conv=conversation||relative.replace(/\/message(?:s)?_\d+\.json$/i,'');
  const group=actualKind==='message'?conv:(sender||platform);
  // If no source-native ID exists, identity is based on conversation/author, time,
  // original content and attachments (never the index/order of the ZIP).
  // Distinct textless check-ins at the same timestamp must not share an ID.
  const identityParts=[group,originalTimestamp,sender,canonicalArchiveText(visibleText),attachments];
  if(sourcePlace)identityParts.push(sourcePlace);
  const stable=native||hash(JSON.stringify(identityParts));
  return {
    key:platform+':'+finalKind+':'+encodeURIComponent(group)+':'+stable,
    platform,kind:finalKind,nativeId:stable,text:visibleText,sourcePlace,
    title:txt(item.title)||'',url:pickUrl(item),
    sender,conversationId:actualKind==='message'?conv:null,attachments,
    createdAt,originalTimestamp,
    sourcePath:cleanPath(path),
    replyTo:item.in_reply_to_status_id_str||item.in_reply_to_status_id||item.replied_to?.id||null,
    lang:txt(item.lang)||null,
    suspectedMojibake:weirdText.test(visibleText),
    raw:row
  };
}
function determine(path,prefix){
  const p=cleanPath(path).toLowerCase();
  const head=prefix.replace(/^\ufeff/,'').trimStart();
  const x=YTD.test(head)||/\/(?:tweets?|note[-_]?tweets?)(?:[-_.]part\d+)?\.(?:js|json)$/i.test('/'+p);
  if(x)return {platform:'x',kind:'post',array:'$',prefix:YTD.test(head)?'ytd':'json'};
  if(/(?:^|\/)messages?(?:_\d+)?\.json$/.test(p)||/\/messages\/inbox\//.test(p)||
     /^\{\s*"participants"\s*:/.test(head)&&/"messages"\s*:/.test(head.slice(0,16000))){
    if(/"messages"\s*:/.test(head.slice(0,16000))||/\/(?:message|messages)_\d+\.json$/.test(p))
      return {platform:category(path)==='instagram'?'instagram':'messenger',kind:'message',array:'messages'};
  }
  if(/(?:threads|text_post_app_text_posts)/.test(p)||/"media_product_type"\s*:\s*"THREADS"/.test(head)){
    return {platform:'threads',kind:'post',array:head.startsWith('[')?'$':rootArray(head,['threads','posts','data','thread_posts','threads_posts','text_post_app_text_posts'])||rootArrayAny(head)};
  }
  if(/your_posts|status_updates|facebook_activity|posts_\d+\.json|posts\.json/.test(p)||
    /"status_updates"\s*:/.test(head)){
    const platform=category(path)==='meta'?'facebook':category(path);
    return {platform,kind:'post',array:head.startsWith('[')?'$':rootArray(head,['status_updates','posts','ig_posts','data'])||rootArrayAny(head)};
  }
  if(/ig_posts|instagram|media\/posts|content\/posts/.test(p)){
    return {platform:'instagram',kind:'post',array:head.startsWith('[')?'$':rootArray(head,['ig_posts','posts','data','media'])||rootArrayAny(head)};
  }
  if(/(?:^|\/)conversations\.json$/.test(p))
    return {platform:'chatgpt',kind:'conversation',array:head.startsWith('[')?'$':rootArray(head,['conversations'])||'$'};
  if(head.startsWith('[')){
    const kind=/\/comments?\//.test(p)?'comment':
      /\/likes?|reactions?\//.test(p)?'reaction':
      /\/stories?\//.test(p)?'story':
      /\/photos?|videos?|reels?|media\//.test(p)?'media':
      /\/friends?|followers?|following\//.test(p)?'relation':'auto';
    return {platform:category(path),kind,array:'$'};
  }
  if(head.startsWith('{')){
    const key=rootArray(head,[
      'conversations','messages','status_updates','ig_posts','posts','threads','threads_posts',
      'text_post_app_text_posts','ig_stories','ig_reels_media','videos_v2','other_photos_v2',
      'photos_v2','comments_v2','likes_media_likes','saved_saved_media',
      'friends_v2','followers','following','data','items','records','entries',
      'comments','stories','reactions','media','videos'
    ])||rootArrayAny(head);
    if(key){
      const kind=key==='conversations'?'conversation':key==='messages'?'message':
        /stories/.test(key)?'story':
        /(?:photos|videos|reels|media)/.test(key)?'media':
        /comments/.test(key)?'comment':
        /likes|reactions/.test(key)?'reaction':
        /friends|follow/.test(key)?'relation':'auto';
      const platform=key==='conversations'?'chatgpt':key==='messages'?(category(path)==='instagram'?'instagram':'messenger'):category(path);
      return {platform,kind,array:key};
    }
  }
  return null;
}
function rootArray(prefix,keys){
  for(const key of keys){
    if(new RegExp('"' + key + '"\\s*:\\s*\\[').test(prefix))return key;
  }
  return null;
}
function rootArrayAny(head){
  // Generic first top-level array for newer Meta export versions. No eval.
  const found=head.match(/^\s*\{\s*"([a-zA-Z][\w-]*)"\s*:\s*\[/);
  return found?.[1]||null;
}
const fileSummary=()=>({
  matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
  suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],
  exifImages:0,exifWithGps:0,exifWithTime:0,exifSkipped:0,
  problems:[],byPlatform:{},unrecognizedFiles:[],mediaFiles:0,unmappedRows:0
});
function report(summary,message){
  if(summary.problems.length<30)summary.problems.push(message);
}
function createSink(path,summary,onRecord,signal){
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const snippetLimit=32768;
  let header='',ready=false,parser=null,config=null,trail='',finished=false,unknown=false;
  const pushRows=({value})=>{
    aborted(signal);
    summary.totalRows++;
    const result=normalize(value,{...config,path,index:summary.totalRows});
    if(result.error||result.kind==='unmapped'){
      if(result.kind==='unmapped')result.error='非可匯入文字紀錄';
      summary.rejectedRows++;
      report(summary,path+'：第 '+summary.totalRows+' 筆 '+result.error);
      return;
    }
    summary.acceptedRows++;
    if(result.kind==='unmapped')summary.unmappedRows++;
    summary.byPlatform[result.platform]=(summary.byPlatform[result.platform]||0)+1;
    if(result.suspectedMojibake)summary.suspiciousRows++;
    if(summary.sample.length<5)summary.sample.push({
      text:result.text.slice(0,260),nativeId:result.nativeId,createdAt:result.createdAt,
      platform:result.platform,kind:result.kind
    });
    onRecord(result);
  };
  function init(){
    config=determine(path,header);
    if(!config||!config.array){
      unknown=true;
      summary.otherFiles++;
      if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(cleanPath(path));
      return;
    }
    const paths=config.array==='$'?['$.*']:['$.'+config.array+'.*'];
    parser=new JSONParser({paths,keepStack:false,stringBufferSize:64*1024});
    parser.onValue=pushRows;
    summary.matchedFiles++;summary.sourceFiles.push(cleanPath(path));ready=true;
    const text=config.prefix==='ytd'?header.replace(YTD,''):header;
    header='';
    parser.write(text);
  }
  function feed(text){
    if(unknown)return;
    if(!ready){
      header+=text;
      if(header.length>snippetLimit||/^\s*(?:\[|\{)/.test(header)||YTD.test(header)){
        if(!/^\s*(?:\[|\{)/.test(header)&&!YTD.test(header)&&header.length<snippetLimit)return;
        init();
      }
    }else parser.write(text);
  }
  return {
    push(bytes,final=false){
      aborted(signal);
      if(finished)throw new Error('檔案解析已結束：'+path);
      const text=decoder.decode(bytes,{stream:!final});
      trail+=text;
      if(!final&&trail.length>32768){
        feed(trail.slice(0,-4096));trail=trail.slice(-4096);
      }
      if(final){
        const last=trail.replace(/;\s*$/,'');trail='';
        if(last)feed(last);
        if(!ready&&!unknown)init();
        if(ready&&!parser.isEnded)parser.end();
        finished=true;
      }
    },
    get finished(){return finished;}
  };
}
function textDocument(bytes,name,summary,onRecord){
  if(bytes.length>MAX_TEXT_DOCUMENT){
    summary.otherFiles++;
    report(summary,name+'：純文字超過 8 MiB，未將整檔載入記憶體。');
    return;
  }
  let encoding='utf-8';
  if(bytes[0]===255&&bytes[1]===254)encoding='utf-16le';
  if(bytes[0]===254&&bytes[1]===255)encoding='utf-16be';
  let content;
  try{content=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{
    summary.otherFiles++;
    report(summary,name+'：文字編碼不明，未自動轉碼或修改。');
    return;
  }
  if(!content.trim()||/[\u0000-\u0008\u000b-\u001f]/.test(content.slice(0,10000))){
    summary.otherFiles++;return;
  }
  const record={key:'document:text:'+hash(content),platform:'document',kind:'document',
    nativeId:hash(content),text:content,createdAt:null,originalTimestamp:'',
    sourcePath:cleanPath(name),replyTo:null,sender:null,conversationId:null,attachments:[],
    suspectedMojibake:weirdText.test(content),raw:{encoding,sourceName:name}};
  summary.matchedFiles++;summary.acceptedRows++;summary.totalRows++;
  summary.byPlatform.document=(summary.byPlatform.document||0)+1;
  summary.sourceFiles.push(cleanPath(name));
  if(record.suspectedMojibake)summary.suspiciousRows++;
  if(summary.sample.length<5)summary.sample.push({text:content.slice(0,260),nativeId:record.nativeId,platform:'document',kind:'document'});
  onRecord(record);
}
// Read-only ZIP source discovery. Every recognized vendor uses the same scanner;
// vendor-specific rules live in archive-source-signatures.mjs.
const ZIP_SNIFF_BYTES=65536;
const ZIP_SNIFF_FILES=160;
export async function detectZipArchiveSource(file,{signal,onProgress}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的 ZIP 備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('ZIP 超過 1024 MiB 安全限制；未讀取檔案內容。');
  const magic=new Uint8Array(await file.slice(0,4).arrayBuffer());
  if(magic[0]!==80||magic[1]!==75||![3,5,7].includes(magic[2]))
    throw new Error('檔案內容不是有效的 ZIP 標頭。');
  const hits=new Map();
  // Filename hints select a source, but the actual records remain authoritative.
  const name=String(file.name||'').toLowerCase();
  const hint=/(?:chatgpt|openai)/.test(name)?'chatgpt':/threads/.test(name)?'threads':
    /facebook/.test(name)?'facebook':/instagram/.test(name)?'instagram':null;
  if(hint)hits.set(hint,{confidence:1,path:file.name});
  let filesSeen=0,inspectedFiles=0,extractedBytes=0;
  const filenames=new Set();
  const profiles=[];
  const audit=createArchiveCompletenessAudit();
  function inspectEvidence(path,head){
    for(const hit of archiveEntrySignatures(path,head)){
      const prior=hits.get(hit.source);
      if(!prior||hit.confidence>prior.confidence)
        hits.set(hit.source,{confidence:hit.confidence,path:hit.path});
    }
  }
  const unzip=new Unzip(entry=>{
    aborted(signal);
    if(++filesSeen>MAX_FILES)throw new Error('ZIP 項目超過 100,000 筆，已停止辨識。');
    const path=cleanPath(entry.name);
    if(!path||path.endsWith('/')){discardZipEntry(unzip,entry);return;}
    const fileAudit=audit.addFile(path);
    filenames.add(path.split('/').at(-1).toLowerCase());
    inspectEvidence(path,'');
    const base=path.split('/').at(-1)||'';
    const priority=/(?:conversations|tweets|threads|messages|posts|status_updates|myactivity|result|_chat|project|workspace|knowledge|attachment|upload)/i.test(base);
    if(skippedZipEntry(path)||![0,8].includes(entry.compression)||
       (priority?inspectedFiles>=ZIP_SNIFF_FILES*2:inspectedFiles>=ZIP_SNIFF_FILES)||
       (entry.originalSize!==undefined&&entry.originalSize>MAX_SNIFF_INFLATE)){
      discardZipEntry(unzip,entry);
      return;
    }
    inspectedFiles++;
    const samples=[];
    let length=0,sniffed=false,received=0;
    function inspectSample(){
      if(sniffed)return;
      sniffed=true;
      const bytes=new Uint8Array(length);
      let offset=0;
      for(const part of samples){bytes.set(part,offset);offset+=part.length;}
      const sample=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
      inspectEvidence(path,sample);
      profiles.push(inspectArchiveEntryStructure(path,sample));
      audit.addSample(fileAudit,sample,{truncated:received>ZIP_SNIFF_BYTES});
    }
    entry.ondata=(error,data,final)=>{
      if(error)throw error;
      extractedBytes+=data.length;
      received+=data.length;
      if(received>MAX_SNIFF_INFLATE)throw new Error('ZIP 取樣檔案解壓超過 2 MiB，已停止辨識。');
      if(extractedBytes>MAX_EXTRACTED)throw new Error('ZIP 解壓資料超過 100 MiB，已停止辨識。');
      if(length<ZIP_SNIFF_BYTES){
        const part=data.subarray(0,ZIP_SNIFF_BYTES-length);
        samples.push(part);length+=part.length;
      }
      if(final)inspectSample();
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  for(let offset=0;offset<file.size;offset+=ARCHIVE_CHUNK_BYTES){
    aborted(signal);
    const chunk=new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
    unzip.push(chunk,offset+chunk.length>=file.size);
    onProgress?.({bytesRead:offset+chunk.length,totalBytes:file.size,filesSeen});
  }
  if(!filesSeen)throw new Error('ZIP 沒有可辨識的檔案項目。');
  // Slack official workspace exports contain a characteristic combination of
  // manifest files; no single generic channels.json is enough to identify it.
  if(filenames.has('channels.json')&&filenames.has('users.json')&&
     (filenames.has('integration_logs.json')||filenames.has('groups.json')||filenames.has('dms.json')))
    hits.set('slack',{confidence:3,path:'channels.json + users.json + Slack workspace manifest'});
  return {...summarizeArchiveSources(hits),filesSeen,inspectedFiles,
    structure:summarizeArchiveStructures(profiles),audit:audit.report()};
}

export async function inspectPrivateArchive(file,{onRecord,onMediaMetadata,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的本機備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('檔案超過 1024 MiB 安全限制；未讀取檔案內容。');
  if(typeof onRecord!=='function')throw new Error('缺少私人本機寫入管線。');
  const summary=fileSummary();
  const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=prefix[0]===80&&prefix[1]===75&&[3,5,7].includes(prefix[2]);
  const read=async offset=>{
    aborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
  };
  if(isZip){
    let filesSeen=0,extracted=0,exifExtracted=0,known=false;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      aborted(signal);
      if(++filesSeen>MAX_FILES)throw new Error('壓縮檔內項目超過 100,000 筆，安全停止。');
      const path=cleanPath(entry.name);
      if(exifImage.test(path)&&typeof onMediaMetadata==='function'&&[0,8].includes(entry.compression)&&
        (entry.originalSize===undefined||entry.originalSize<=8*1024*1024)&&summary.exifImages<2500){
        summary.mediaFiles++;summary.exifImages++;known=true;
        const chunks=[];let stored=0,received=0;
        entry.ondata=(error,data,final)=>{
          if(error)throw error;
          received+=data.length;exifExtracted+=data.length;
          if(exifExtracted>100*1024*1024)throw new Error('EXIF 媒體解壓總量超過 100 MiB。');
          if(received>8*1024*1024)throw new Error(path+'：影像超過 EXIF 安全解析上限。');
          if(stored<IMAGE_EXIF_PREFIX_LIMIT){
            const part=data.subarray(0,IMAGE_EXIF_PREFIX_LIMIT-stored);
            if(part.length){chunks.push(part);stored+=part.length;}
          }
          if(final){
            const sample=new Uint8Array(stored);let pos=0;
            for(const chunk of chunks){sample.set(chunk,pos);pos+=chunk.length;}
            const metadata=readImageExif(sample,path);
            if(metadata){
              if(metadata.latitude!==undefined)summary.exifWithGps++;
              if(metadata.cameraLocalTime)summary.exifWithTime++;
              onMediaMetadata({path,metadata});
            }
          }
        };
        entry.start();
        return;
      }
      if(skippedZipEntry(path)){
        summary.otherFiles++;
        if(mediaExtension.test(path)){summary.mediaFiles++;if(exifImage.test(path))summary.exifSkipped++;}
        else if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(path);
        discardZipEntry(unzip,entry);
        return;
      }
      if(![0,8].includes(entry.compression)){
        summary.otherFiles++;
        report(summary,path+'：ZIP 壓縮格式不支援，已略過。');
        discardZipEntry(unzip,entry);
        return;
      }
      const sizeLimit=/\.(?:json|js)$/i.test(path)?MAX_STRUCTURED_DOCUMENT:MAX_TEXT_DOCUMENT;
      if(entry.originalSize!==undefined&&entry.originalSize>sizeLimit){
        summary.otherFiles++;
        report(summary,path+'：解壓後單檔超過安全上限，已略過。');
        discardZipEntry(unzip,entry);
        return;
      }
      const chunks=[];
      let textSize=0;
      const isStructured=/\.(?:json|js)$/i.test(path);
      const sink=isStructured?createSink(path,summary,onRecord,signal):null;
      const session={path,ended:false};sessions.push(session);
      entry.ondata=(error,data,final)=>{
        if(error)throw error;
        extracted+=data.length;
        if(extracted>MAX_EXTRACTED)throw new Error('解壓超過 100 MiB，拒絕繼續展開。');
        textSize+=data.length;
        if(textSize>sizeLimit)throw new Error(path+'：解壓後單檔超過安全上限。');
        if(isStructured)sink.push(data,Boolean(final));
        else chunks.push(data);
        if(final){
          session.ended=true;
          if(!isStructured){
            const all=new Uint8Array(Math.min(textSize,MAX_TEXT_DOCUMENT));
            if(textSize>MAX_TEXT_DOCUMENT){summary.otherFiles++;report(summary,path+'：文字檔過大，未自動建立紀錄。');}
            else{
              let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
              textDocument(all,path,summary,onRecord);
            }
          }
        }
      };
      entry.start();
      known=true;
    });
    unzip.register(UnzipInflate);
    for(let offset=0;offset<file.size;offset+=ARCHIVE_CHUNK_BYTES){
      const chunk=await read(offset);
      unzip.push(chunk,offset+chunk.length>=file.size);
      summary.bytesRead+=chunk.length;
      await flush?.();
      onProgress?.({...summary});
    }
    if(!known||sessions.some(s=>!s.ended))throw new Error('壓縮檔內容不存在或未完整展開。');
  }else{
    const path=file.name||'unnamed';
    const sample=new Uint8Array(await file.slice(0,Math.min(file.size,512)).arrayBuffer());
    const textHead=new TextDecoder('utf-8',{fatal:false}).decode(sample);
    const looksJson=/^\s*[\[{]/.test(textHead)||YTD.test(textHead);
    if(!looksJson){
      if(file.size>MAX_TEXT_DOCUMENT)throw new Error('非結構化檔案超過 8 MiB，未嘗試全文載入。');
      const buffer=new Uint8Array(await file.arrayBuffer?.()||await file.slice(0,file.size).arrayBuffer());
      textDocument(buffer,path,summary,onRecord);
      summary.bytesRead=file.size;
    }else{
      if(file.size>MAX_STRUCTURED_DOCUMENT)throw new Error('結構化檔案超過 50 MiB 上限，未嘗試解析。');
      const sink=createSink(path,summary,onRecord,signal);
      for(let offset=0;offset<file.size;offset+=ARCHIVE_CHUNK_BYTES){
        const chunk=await read(offset);
        sink.push(chunk,offset+chunk.length>=file.size);
        summary.bytesRead+=chunk.length;
        await flush?.();onProgress?.({...summary});
      }
    }
  }
  await flush?.(true);
  if(!summary.acceptedRows)
    throw new Error('沒有辨識到可匯入的紀錄。請查看備份格式，不會寫入正式資料。');
  return summary;
}
