// LOC's shared, offline, multi-source archive inspection engine.
// Never uploads contents. zip.js-like mature primitives: fflate for ZIP; @streamparser/json for JSON.
// Unsupported formats are explicitly accounted for; no speculative field coercion.
import {Unzip,UnzipInflate} from 'fflate';
import {JSONParser} from '@streamparser/json';

export const ARCHIVE_CHUNK_BYTES=128*1024;
export const ARCHIVE_MAX_BYTES=2*1024*1024*1024;
const MAX_EXTRACTED=3*1024*1024*1024;
const MAX_FILES=50000,MAX_TEXT_DOCUMENT=8*1024*1024;
const YTD=/^\s*(?:\/\*[\s\S]*?\*\/\s*)?window\.YTD\.[\w-]+\.part\d+\s*=\s*/;
const textExtension=/\.(?:json|js|txt|md|csv|tsv|html?|xml|log|jsonl)$/i;
const mediaExtension=/\.(?:jpe?g|png|gif|webp|heic|mp4|mov|avi|pdf|mp3|ogg|m4a|zip|gz|woff2?|svg)$/i;
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
  const text=platform==='x'?(txt(item.full_text)||txt(item.core?.text)||txt(item.text)):
    actualKind==='message'?(txt(item.content)||txt(item.text)||null):
    actualKind==='post'?(extractCaption(item)||txt(data['Title']?.value)||null):
    extractCaption(item);
  const attachments=[
    ...(Array.isArray(item.photos)?item.photos:[]),
    ...(Array.isArray(item.videos)?item.videos:[]),
    ...(Array.isArray(item.audio_files)?item.audio_files:[]),
    ...(Array.isArray(item.attachments)?item.attachments:[]),
    ...(Array.isArray(item.media)?item.media:[]),
    ...(item.uri?[{uri:item.uri}]:[])
  ].map(v=>({uri:txt(v?.uri)||txt(v?.media?.uri)||null})).filter(v=>v.uri).slice(0,200);
  if(actualKind==='message'&&text===null&&!attachments.length)
    return {error:'訊息沒有文字或可辨識附件'};
  if(actualKind==='post'&&text===null&&!attachments.length)
    return {error:'貼文沒有可辨識文字或附件'};
  // Unmapped records are deliberately labelled; preserve full raw JSON rather
  // than misrepresenting arbitrary Meta data as a post or message.
  const unmapped=!text&&!attachments.length;
  const finalKind=unmapped?'unmapped':actualKind;
  const visibleText=unmapped?JSON.stringify(row):text||'';
  const native=String(item.id_str||item.id||item.post_id||item.media_id||
    item.noteTweetId||item.uri||'');
  const timestamp=item.timestamp_ms??item.timestamp??item.creation_timestamp??
    item.taken_at??item.created_at??item.createdAt??item.date??item.core?.createdAt??
    item.string_map_data?.['Creation Time']?.timestamp;
  const createdAt=iso(timestamp);
  const originalTimestamp=timestamp===undefined?'':String(timestamp);
  const relative=cleanPath(path).replace(/^.*?(?=messages\/)/i,'');
  const conv=conversation||relative.replace(/\/message(?:s)?_\d+\.json$/i,'');
  const group=actualKind==='message'?conv:(sender||platform);
  // If no source-native ID exists, identity is based on conversation/author, time,
  // original content and attachments (never the index/order of the ZIP).
  const stable=native||hash(JSON.stringify([group,originalTimestamp,sender,visibleText,attachments]));
  return {
    key:platform+':'+finalKind+':'+encodeURIComponent(group)+':'+stable,
    platform,kind:finalKind,nativeId:stable,text:visibleText,
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
  if(/threads/.test(p)||/"media_product_type"\s*:\s*"THREADS"/.test(head)){
    return {platform:'threads',kind:'post',array:head.startsWith('[')?'
  }
  if(/your_posts|status_updates|facebook_activity|posts_\d+\.json|posts\.json/.test(p)||
    /"status_updates"\s*:/.test(head)){
    const platform=category(path)==='meta'?'facebook':category(path);
    return {platform,kind:'post',array:head.startsWith('[')?'$':rootArray(head,['status_updates','posts','ig_posts','data'])};
  }
  if(/ig_posts|instagram|media\/posts|content\/posts/.test(p)){
    return {platform:'instagram',kind:'post',array:head.startsWith('[')?'$':rootArray(head,['ig_posts','posts','data','media'])};
  }
  if(head.startsWith('[')){
    const kind=/\/comments?\//.test(p)?'comment':
      /\/likes?|reactions?\//.test(p)?'reaction':
      /\/stories?\//.test(p)?'story':
      /\/photos?|videos?|reels?|media\//.test(p)?'media':
      /\/friends?|followers?|following\//.test(p)?'relation':'auto';
    return {platform:category(path),kind,array:'
  if(head.startsWith('{')){
    const key=rootArray(head,[
      'messages','status_updates','ig_posts','posts','threads','threads_posts',
      'text_post_app_text_posts','ig_stories','ig_reels_media','videos_v2','other_photos_v2',
      'photos_v2','comments_v2','likes_media_likes','saved_saved_media',
      'friends_v2','followers','following','data','items','records','entries',
      'comments','stories','reactions','media','videos'
    ])||rootArrayAny(head);
    if(key){
      const kind=key==='messages'?'message':
        /stories/.test(key)?'story':
        /(?:photos|videos|reels|media)/.test(key)?'media':
        /comments/.test(key)?'comment':
        /likes|reactions/.test(key)?'reaction':
        /friends|follow/.test(key)?'relation':'auto';
      const platform=key==='messages'?(category(path)==='instagram'?'instagram':'messenger'):category(path);
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
  // Generic top-level JSON array mapping for newly added Meta export sections.
  // Do not eval data or fabricate semantic interpretations.
  const found=head.match(/^\s*\{\s*"([a-zA-Z][\\w-]*)"\s*:\s*\[/);
  return found?.[1]||null;
}
const fileSummary=()=>({
  matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
  suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],
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
    if(result.error){
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
export async function inspectPrivateArchive(file,{onRecord,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的本機備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('檔案超過 2 GiB 安全限制；未修改原檔。');
  if(typeof onRecord!=='function')throw new Error('缺少私人本機寫入管線。');
  const summary=fileSummary();
  const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=prefix[0]===80&&prefix[1]===75&&[3,5,7].includes(prefix[2]);
  const read=async offset=>{
    aborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
  };
  if(isZip){
    let filesSeen=0,extracted=0,known=false;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      aborted(signal);
      if(++filesSeen>MAX_FILES)throw new Error('壓縮檔內項目超過 50,000 筆，安全停止。');
      const path=cleanPath(entry.name);
      if(path.endsWith('/')||mediaExtension.test(path)){
        summary.otherFiles++;
        if(mediaExtension.test(path))summary.mediaFiles++;
        return;
      }
      if(!textExtension.test(path)&&/\.[a-z0-9]{1,8}$/i.test(path)){
        summary.otherFiles++;
        if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(path);
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
        if(extracted>MAX_EXTRACTED)throw new Error('解壓超過 3 GiB，拒絕繼續展開。');
        if(isStructured)sink.push(data,Boolean(final));
        else if(textSize<=MAX_TEXT_DOCUMENT){
          textSize+=data.length;
          if(textSize<=MAX_TEXT_DOCUMENT)chunks.push(data);
        }
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
      if(file.size>MAX_TEXT_DOCUMENT)throw new Error('無法辨識為結構化備份的大型檔案；未嘗試全文載入。');
      const buffer=new Uint8Array(await file.arrayBuffer?.()||await file.slice(0,file.size).arrayBuffer());
      textDocument(buffer,path,summary,onRecord);
      summary.bytesRead=file.size;
    }else{
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
:rootArray(head,['threads','posts','data','thread_posts','threads_posts','text_post_app_text_posts'])};
  }
  if(/your_posts|status_updates|facebook_activity|posts_\d+\.json|posts\.json/.test(p)||
    /"status_updates"\s*:/.test(head)){
    const platform=category(path)==='meta'?'facebook':category(path);
    return {platform,kind:'post',array:head.startsWith('[')?'$':rootArray(head,['status_updates','posts','ig_posts','data'])};
  }
  if(/ig_posts|instagram|media\/posts|content\/posts/.test(p)){
    return {platform:'instagram',kind:'post',array:head.startsWith('[')?'$':rootArray(head,['ig_posts','posts','data','media'])};
  }
  if(head.startsWith('['))return {platform:category(path),kind:'auto',array:'$'};
  if(head.startsWith('{')){
    const key=rootArray(head,['messages','status_updates','ig_posts','posts','threads','data','items','records','entries','comments','stories','reactions']);
    if(key)return {platform:key==='messages'?'messenger':category(path),kind:key==='messages'?'message':'auto',array:key};
  }
  return null;
}
function rootArray(prefix,keys){
  for(const key of keys){
    if(new RegExp('"' + key + '"\\s*:\\s*\\[').test(prefix))return key;
  }
  return null;
}
const fileSummary=()=>({
  matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
  suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],
  problems:[],byPlatform:{},unrecognizedFiles:[],mediaFiles:0
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
    if(result.error){
      summary.rejectedRows++;
      report(summary,path+'：第 '+summary.totalRows+' 筆 '+result.error);
      return;
    }
    summary.acceptedRows++;
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
export async function inspectPrivateArchive(file,{onRecord,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的本機備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('檔案超過 2 GiB 安全限制；未修改原檔。');
  if(typeof onRecord!=='function')throw new Error('缺少私人本機寫入管線。');
  const summary=fileSummary();
  const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=prefix[0]===80&&prefix[1]===75&&[3,5,7].includes(prefix[2]);
  const read=async offset=>{
    aborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
  };
  if(isZip){
    let filesSeen=0,extracted=0,known=false;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      aborted(signal);
      if(++filesSeen>MAX_FILES)throw new Error('壓縮檔內項目超過 50,000 筆，安全停止。');
      const path=cleanPath(entry.name);
      if(path.endsWith('/')||mediaExtension.test(path)){
        summary.otherFiles++;
        if(mediaExtension.test(path))summary.mediaFiles++;
        return;
      }
      if(!textExtension.test(path)&&/\.[a-z0-9]{1,8}$/i.test(path)){
        summary.otherFiles++;
        if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(path);
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
        if(extracted>MAX_EXTRACTED)throw new Error('解壓超過 3 GiB，拒絕繼續展開。');
        if(isStructured)sink.push(data,Boolean(final));
        else if(textSize<=MAX_TEXT_DOCUMENT){
          textSize+=data.length;
          if(textSize<=MAX_TEXT_DOCUMENT)chunks.push(data);
        }
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
      if(file.size>MAX_TEXT_DOCUMENT)throw new Error('無法辨識為結構化備份的大型檔案；未嘗試全文載入。');
      const buffer=new Uint8Array(await file.arrayBuffer?.()||await file.slice(0,file.size).arrayBuffer());
      textDocument(buffer,path,summary,onRecord);
      summary.bytesRead=file.size;
    }else{
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
};
  }
  if(head.startsWith('{')){
    const key=rootArray(head,['messages','status_updates','ig_posts','posts','threads','data','items','records','entries','comments','stories','reactions']);
    if(key)return {platform:key==='messages'?'messenger':category(path),kind:key==='messages'?'message':'auto',array:key};
  }
  return null;
}
function rootArray(prefix,keys){
  for(const key of keys){
    if(new RegExp('"' + key + '"\\s*:\\s*\\[').test(prefix))return key;
  }
  return null;
}
const fileSummary=()=>({
  matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
  suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],
  problems:[],byPlatform:{},unrecognizedFiles:[],mediaFiles:0
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
    if(result.error){
      summary.rejectedRows++;
      report(summary,path+'：第 '+summary.totalRows+' 筆 '+result.error);
      return;
    }
    summary.acceptedRows++;
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
export async function inspectPrivateArchive(file,{onRecord,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的本機備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('檔案超過 2 GiB 安全限制；未修改原檔。');
  if(typeof onRecord!=='function')throw new Error('缺少私人本機寫入管線。');
  const summary=fileSummary();
  const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=prefix[0]===80&&prefix[1]===75&&[3,5,7].includes(prefix[2]);
  const read=async offset=>{
    aborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
  };
  if(isZip){
    let filesSeen=0,extracted=0,known=false;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      aborted(signal);
      if(++filesSeen>MAX_FILES)throw new Error('壓縮檔內項目超過 50,000 筆，安全停止。');
      const path=cleanPath(entry.name);
      if(path.endsWith('/')||mediaExtension.test(path)){
        summary.otherFiles++;
        if(mediaExtension.test(path))summary.mediaFiles++;
        return;
      }
      if(!textExtension.test(path)&&/\.[a-z0-9]{1,8}$/i.test(path)){
        summary.otherFiles++;
        if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(path);
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
        if(extracted>MAX_EXTRACTED)throw new Error('解壓超過 3 GiB，拒絕繼續展開。');
        if(isStructured)sink.push(data,Boolean(final));
        else if(textSize<=MAX_TEXT_DOCUMENT){
          textSize+=data.length;
          if(textSize<=MAX_TEXT_DOCUMENT)chunks.push(data);
        }
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
      if(file.size>MAX_TEXT_DOCUMENT)throw new Error('無法辨識為結構化備份的大型檔案；未嘗試全文載入。');
      const buffer=new Uint8Array(await file.arrayBuffer?.()||await file.slice(0,file.size).arrayBuffer());
      textDocument(buffer,path,summary,onRecord);
      summary.bytesRead=file.size;
    }else{
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
:rootArray(head,['threads','posts','data','thread_posts','threads_posts','text_post_app_text_posts'])};
  }
  if(/your_posts|status_updates|facebook_activity|posts_\d+\.json|posts\.json/.test(p)||
    /"status_updates"\s*:/.test(head)){
    const platform=category(path)==='meta'?'facebook':category(path);
    return {platform,kind:'post',array:head.startsWith('[')?'$':rootArray(head,['status_updates','posts','ig_posts','data'])};
  }
  if(/ig_posts|instagram|media\/posts|content\/posts/.test(p)){
    return {platform:'instagram',kind:'post',array:head.startsWith('[')?'$':rootArray(head,['ig_posts','posts','data','media'])};
  }
  if(head.startsWith('['))return {platform:category(path),kind:'auto',array:'$'};
  if(head.startsWith('{')){
    const key=rootArray(head,['messages','status_updates','ig_posts','posts','threads','data','items','records','entries','comments','stories','reactions']);
    if(key)return {platform:key==='messages'?'messenger':category(path),kind:key==='messages'?'message':'auto',array:key};
  }
  return null;
}
function rootArray(prefix,keys){
  for(const key of keys){
    if(new RegExp('"' + key + '"\\s*:\\s*\\[').test(prefix))return key;
  }
  return null;
}
const fileSummary=()=>({
  matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
  suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],
  problems:[],byPlatform:{},unrecognizedFiles:[],mediaFiles:0
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
    if(result.error){
      summary.rejectedRows++;
      report(summary,path+'：第 '+summary.totalRows+' 筆 '+result.error);
      return;
    }
    summary.acceptedRows++;
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
export async function inspectPrivateArchive(file,{onRecord,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<=0)
    throw new Error('請選擇有效的本機備份檔。');
  if(file.size>ARCHIVE_MAX_BYTES)throw new Error('檔案超過 2 GiB 安全限制；未修改原檔。');
  if(typeof onRecord!=='function')throw new Error('缺少私人本機寫入管線。');
  const summary=fileSummary();
  const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=prefix[0]===80&&prefix[1]===75&&[3,5,7].includes(prefix[2]);
  const read=async offset=>{
    aborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+ARCHIVE_CHUNK_BYTES)).arrayBuffer());
  };
  if(isZip){
    let filesSeen=0,extracted=0,known=false;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      aborted(signal);
      if(++filesSeen>MAX_FILES)throw new Error('壓縮檔內項目超過 50,000 筆，安全停止。');
      const path=cleanPath(entry.name);
      if(path.endsWith('/')||mediaExtension.test(path)){
        summary.otherFiles++;
        if(mediaExtension.test(path))summary.mediaFiles++;
        return;
      }
      if(!textExtension.test(path)&&/\.[a-z0-9]{1,8}$/i.test(path)){
        summary.otherFiles++;
        if(summary.unrecognizedFiles.length<60)summary.unrecognizedFiles.push(path);
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
        if(extracted>MAX_EXTRACTED)throw new Error('解壓超過 3 GiB，拒絕繼續展開。');
        if(isStructured)sink.push(data,Boolean(final));
        else if(textSize<=MAX_TEXT_DOCUMENT){
          textSize+=data.length;
          if(textSize<=MAX_TEXT_DOCUMENT)chunks.push(data);
        }
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
      if(file.size>MAX_TEXT_DOCUMENT)throw new Error('無法辨識為結構化備份的大型檔案；未嘗試全文載入。');
      const buffer=new Uint8Array(await file.arrayBuffer?.()||await file.slice(0,file.size).arrayBuffer());
      textDocument(buffer,path,summary,onRecord);
      summary.bytesRead=file.size;
    }else{
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
