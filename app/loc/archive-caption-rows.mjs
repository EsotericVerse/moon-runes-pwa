// Keep captions as Galaxy text and media as Galaxy Media records.
// Structural parents represent actual platform media posts but are not user prose.
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {facebookArchiveUid} from './facebook-backup-place.mjs';
import {repairMojibakeText} from './content-policy.js';
import {archiveAttachmentReferences} from './archive-media-evidence.mjs';
import {parseImportCreatedTime} from './import-batch.mjs';

const clean=value=>repairMojibakeText(String(value||'').trim());
const captionOf=raw=>Array.isArray(raw?.label_values)?
  clean(raw.label_values.find(item=>clean(item?.label)==='說明文字')?.value):'';

export function archiveGalaxyRows(record){
  const album=record?.platform==='facebook'&&record?.kind==='media'&&
    /(?:^|\/)posts\/album\/[^/]+\.json$/.test(String(record.sourcePath||''))?
    record.raw:null;
  if(album&&Array.isArray(album.photos)){
    const name=clean(album.name)||'Facebook 相簿';
    const description=clean(album.description);
    const parentUid=facebookArchiveUid('archive:album:'+record.sourcePath);
    const captions=album.photos.flatMap((photo,index)=>{
      const text=clean(photo?.title);
      const attachments=archiveAttachmentReferences(photo);
      if(!text||!attachments.length)return [];
      const uid=facebookArchiveUid('archive:album-caption:'+record.sourcePath+':'+
        String(photo.uri||index));
      return [{
        row:{uid,title:Array.from(text).slice(0,120).join(''),
          content:text,createtime:parseImportCreatedTime(photo.creation_timestamp)||null,
          site:'Facebook',site_id:null,source_id:parentUid},
        attachments
      }];
    });
    const parent={
      uid:parentUid,title:name,content:description||name,createtime:null,
      site:'Facebook',site_id:null,
      searchable:Boolean(description),statistics_able:Boolean(description),
      ...(captions.length?{target_id:captions.map(entry=>entry.row.uid)}:{})
    };
    return [{row:parent,attachments:record.attachments||[]},...captions];
  }
  const original=archiveGalaxyRow(record);
  if(!original)return [];
  const attachments=Array.isArray(record.attachments)?record.attachments:[];
  const caption=record.platform==='instagram'?captionOf(record.raw):'';
  if(caption&&caption===original.content&&attachments.length){
    const parent={
      ...original,title:'Instagram 媒體貼文',content:'Instagram 媒體貼文',
      searchable:false,statistics_able:false
    };
    const child={
      ...original,uid:facebookArchiveUid('archive:caption:'+record.key),
      site_id:null,source_id:parent.uid,
      title:Array.from(caption).slice(0,120).join(''),content:caption
    };
    parent.target_id=[child.uid];
    return [{row:parent,attachments:[]},{row:child,attachments}];
  }
  return [{row:original,attachments}];
}
