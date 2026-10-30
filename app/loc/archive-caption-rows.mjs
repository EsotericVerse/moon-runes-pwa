// Facebook album photos with their own text become pic_text rows (one picture each);
// media are Galaxy Media records and never hold text.
// Structural parents represent actual platform media posts but are not user prose.
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {facebookArchiveUid} from './facebook-backup-place.mjs';
import {repairMojibakeText} from './content-policy.js';
import {archiveAttachmentReferences} from './archive-media-evidence.mjs';
import {parseImportCreatedTime} from './import-batch.mjs';

const clean=value=>repairMojibakeText(String(value||'').trim());

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
  // An Instagram caption belongs to the whole post, not to one picture. It stays
  // in the post's own text and every picture hangs on that post's media_link.
  return [{row:original,attachments:Array.isArray(record.attachments)?record.attachments:[]}];
}
