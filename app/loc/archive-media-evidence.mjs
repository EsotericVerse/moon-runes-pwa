// Preserve ZIP media references and private EXIF evidence without keeping image bytes.
const MAX_MEDIA_PER_RECORD=200;
const URI_KEYS=['uri','src','media_uri','mediaUri','path','relative_path','relativePath'];
const URL_KEYS=['url','media_url','mediaUrl','image_url','video_url','download_url','downloadUrl','display_url'];
const CHILD_KEYS=['photos','videos','audio_files','attachments','media','data','items','image_versions2','image','video','photo'];
const HTTP=/^https?:\/\/[^/\s]+/i;
const MEDIA_EXT=/\.(?:jpe?g|png|gif|webp|heic|avif|tiff?|mp4|mov|mkv|webm|mp3|m4a|wav|ogg|flac)(?:[?#]|$)/i;
const rawPath=value=>String(value||'').trim().replace(/\\/g,'/');
const pathValue=value=>rawPath(value).replace(/^\.\//,'');
const validRef=value=>Boolean(value&&value.length<=2048&&
  !/[\u0000-\u001f]/u.test(value)&&
  (HTTP.test(value)||(!value.startsWith('/')&&!value.split('/').includes('..'))));
const publicUrl=value=>HTTP.test(value)&&validRef(value)?value:null;
export function archiveMediaType(uri,hint=''){
  const text=String(hint||'').toLowerCase();
  if(/image|photo/.test(text))return 'image';
  if(/video/.test(text))return 'video';
  if(/audio|voice/.test(text))return 'audio';
  const path=String(uri||'').toLowerCase().split(/[?#]/)[0];
  return /\.(?:jpe?g|png|gif|webp|heic|avif|tiff?)$/.test(path)?'image':
    /\.(?:mp4|mov|mkv|webm)$/.test(path)?'video':
    /\.(?:mp3|m4a|wav|ogg|flac)$/.test(path)?'audio':'attachment';
}
// Return only actual media references. Do not confuse post permalinks with image URLs.
export function archiveAttachmentReferences(record){
  if(!record||typeof record!=='object')return [];
  const roots=[record.photos,record.videos,record.audio_files,record.attachments,record.media,
    ...(Array.isArray(record.data)?record.data.flatMap(item=>
      [item?.attachments,item?.media,item?.photos,item?.videos].filter(Boolean)):[])];
  if((typeof record.uri==='string'&&MEDIA_EXT.test(record.uri))||
      /^(image|photo|video|audio)/i.test(String(record.media_type||'')))roots.push(record);
  const queue=roots.filter(Boolean).map(value=>({value,depth:0}));
  const visited=new WeakSet(),found=new Map();
  let examined=0;
  while(queue.length&&examined<3000&&found.size<MAX_MEDIA_PER_RECORD){
    const {value,depth}=queue.shift();examined++;
    if(!value||typeof value!=='object')continue;
    if(visited.has(value))continue;
    visited.add(value);
    if(Array.isArray(value)){for(const item of value)queue.push({value:item,depth});continue;}
    const hint=String(value.media_type||value.type||value.mime_type||'');
    const paths=URI_KEYS.map(key=>value[key]).filter(v=>typeof v==='string')
      .map(pathValue).filter(validRef);
    const allUrls=URL_KEYS.map(key=>value[key]).filter(v=>typeof v==='string').map(rawPath);
    for(const maybePath of allUrls)if(!HTTP.test(maybePath)&&MEDIA_EXT.test(maybePath)&&
        validRef(maybePath))paths.push(maybePath);
    const urls=allUrls.filter(v=>publicUrl(v));
    const directUrl=urls[0]||paths.find(v=>HTTP.test(v))||null;
    const relative=paths.filter(v=>!HTTP.test(v));
    for(const uri of relative.length?relative:directUrl?[directUrl]:[]){
      const mediaType=archiveMediaType(uri,hint);
      const existing=found.get(uri);
      if(!existing||(!existing.url&&directUrl))
        found.set(uri,{uri,mediaType,url:publicUrl(directUrl)});
    }
    if(depth<6)for(const key of CHILD_KEYS)if(value[key]!=null)
      queue.push({value:value[key],depth:depth+1});
  }
  return [...found.values()];
}
function platformFromPath(path){
  const p=String(path).toLowerCase();
  if(/(?:^|\/)(?:threads|threads_and_replies)(?:\/|$)/.test(p))return 'threads';
  if(/(?:^|\/)(?:facebook|your_facebook_activity)(?:\/|$)/.test(p))return 'facebook';
  if(/(?:^|\/)(?:instagram|your_instagram_activity)(?:\/|$)/.test(p))return 'instagram';
  return '';
}
export function createArchiveEvidenceCollector(){
  const records=new Map();
  function locate(raw){
    const path=pathValue(raw);
    if(!validRef(path))return null;
    if(!records.has(path))records.set(path,{
      entry_path:path,platform:platformFromPath(path),media_type:archiveMediaType(path),
      galaxy_uids:new Set(),source_files:new Set(),url:publicUrl(path),
      latitude:null,longitude:null,camera_local_time:null,found_in_zip:false
    });
    return records.get(path);
  }
  return {
    onRecord(record,galaxyUid){
      for(const attachment of record?.attachments||[]){
        const item=locate(attachment.uri);
        if(!item)continue;
        item.platform=String(record.platform||item.platform||'').slice(0,32);
        item.media_type=attachment.mediaType||item.media_type;
        item.url=publicUrl(attachment.url)||item.url;
        if(galaxyUid)item.galaxy_uids.add(galaxyUid);
        if(record.sourcePath)item.source_files.add(record.sourcePath);
      }
    },
    onMediaEntry({path}){
      const item=locate(path);
      if(item)item.found_in_zip=true;
    },
    onExif({path,metadata}){
      if(!metadata)return;
      const lat=metadata.latitude,lng=metadata.longitude;
      const coordinates=Number.isFinite(lat)&&Number.isFinite(lng)&&
        Math.abs(lat)<=90&&Math.abs(lng)<=180;
      if(!coordinates&&!metadata.cameraLocalTime)return;
      const item=locate(path);
      if(!item)return;
      item.found_in_zip=true;
      if(coordinates){item.latitude=lat;item.longitude=lng;}
      item.camera_local_time=String(metadata.cameraLocalTime||'').slice(0,64)||null;
    },
    rows({scopeId,archiveName,archiveSize}){
      const archiveId=String(archiveName||'archive').slice(0,260)+':'+String(archiveSize);
      // Match a suffix only when it maps to exactly one archive entry. Filename-only
      // guesses are forbidden: two similar photos may belong to different posts.
      const present=[...records.values()].filter(row=>row.found_in_zip);
      const suffixes=new Map();
      for(const image of present){
        const parts=image.entry_path.split('/');
        for(let start=0;start<parts.length;start++){
          const key=parts.slice(start).join('/');
          if(!suffixes.has(key))suffixes.set(key,image);
          else if(suffixes.get(key)!==image)suffixes.set(key,null);
        }
      }
      for(const ref of [...records.values()]){
        if(ref.found_in_zip||HTTP.test(ref.entry_path))continue;
        const image=suffixes.get(ref.entry_path);
        if(!image)continue;
        for(const uid of ref.galaxy_uids)image.galaxy_uids.add(uid);
        for(const file of ref.source_files)image.source_files.add(file);
        if(ref.url&&!image.url)image.url=ref.url;
        if(ref.platform&&!image.platform)image.platform=ref.platform;
        records.delete(ref.entry_path);
      }
      return [...records.values()]
        .filter(item=>Boolean(publicUrl(item.url))||
          (Number.isFinite(item.latitude)&&Number.isFinite(item.longitude))||
          Boolean(item.camera_local_time))
        .map(item=>({
        scope_id:scopeId,archive_id:archiveId,entry_path:item.entry_path,
        platform:item.platform||null,media_type:item.media_type,
        galaxy_uids:[...item.galaxy_uids],source_files:[...item.source_files],
        url:item.url,latitude:item.latitude,longitude:item.longitude,
        camera_local_time:item.camera_local_time,found_in_zip:item.found_in_zip
      }));
    },
    count(){return records.size;}
  };
}
// A stable UUID prevents re-importing the same archive path into duplicate media.
export function archiveMediaUid(scopeId,archiveId,entryPath){
  const input=String(scopeId)+'\u0000'+String(archiveId)+'\u0000'+String(entryPath);
  const seeds=[2166136261,338855925,2654435761,2246822519];
  const hex=seeds.map((seed,i)=>{
    let value=seed>>>0;
    for(const ch of input){value=Math.imul(value^ch.codePointAt(0),i%2?2246822519:16777619);}
    return (value>>>0).toString(16).padStart(8,'0');
  }).join('');
  const uuid=hex.slice(0,8)+'-'+hex.slice(8,12)+'-5'+hex.slice(13,16)+
    '-a'+hex.slice(17,20)+'-'+hex.slice(20,32);
  return (BigInt('0x'+uuid.replaceAll('-',''))%(36n**8n)).toString(36).toUpperCase().padStart(8,'0');
}
export function prepareArchiveMedia(evidence=[],knownUids=new Set()){
  const media=[],exif=[],mediaLinks=[];
  for(const entry of evidence){
    const id=archiveMediaUid(entry.scope_id,entry.archive_id,entry.entry_path);
    const owners=(entry.galaxy_uids||[]).filter(uid=>knownUids.has(uid));
    const type=entry.media_type||archiveMediaType(entry.entry_path);
    const row={
      uid:id,media_type:type,url:publicUrl(entry.url),
      title:'封存'+({image:'圖片',video:'影片',audio:'音訊'}[type]||'附件'),
      meta_tags:null,createtime:null,location:null
    };
    const hasUrl=Boolean(row.url);
    if(hasUrl){
      media.push({...row,__article_uid:owners[0]||null});
      for(const uid of owners)mediaLinks.push({uid,media_uid:id});
    }
    if((Number.isFinite(entry.latitude)&&Number.isFinite(entry.longitude))||entry.camera_local_time)
      exif.push({
        media_uid:hasUrl?id:null,archive_id:entry.archive_id,entry_path:entry.entry_path,
        platform:entry.platform||null,latitude:entry.latitude,
        longitude:entry.longitude,camera_local_time:entry.camera_local_time
      });
  }
  return {media,exif,mediaLinks};
}
