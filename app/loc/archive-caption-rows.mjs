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
    // The album's own creation time when the export has one, otherwise its
    // earliest photo (stable when photos are added later), then last modified.
    const photoTimes=album.photos.map(photo=>parseImportCreatedTime(photo?.creation_timestamp))
      .filter(Boolean).sort();
    const albumTime=parseImportCreatedTime(album.creation_timestamp??album.created_timestamp??
      album.create_timestamp)||photoTimes[0]||parseImportCreatedTime(album.last_modified_timestamp)||null;
    const looseAttachments=[];
    const captions=album.photos.flatMap((photo,index)=>{
      // A photo's own text is its title and its description (both are in the export).
      const photoTitle=clean(photo?.title),photoDescription=clean(photo?.description);
      const text=[...new Set([photoTitle,photoDescription].filter(Boolean))].join('\n\n');
      const attachments=archiveAttachmentReferences(photo);
      // A picture without its own text hangs on the album; one with text hangs
      // only on its own pic_text, so a pic_text always has exactly one picture.
      if(!text||!attachments.length){looseAttachments.push(...attachments);return [];}
      const uid=facebookArchiveUid('archive:album-caption:'+record.sourcePath+':'+
        String(photo.uri||index));
      return [{
        row:{uid,title:Array.from(photoTitle||photoDescription).slice(0,120).join(''),
          content:text,createtime:parseImportCreatedTime(photo.creation_timestamp)||albumTime,
          site:'Facebook',site_id:null,source_id:parentUid},
        attachments
      }];
    });
    const parent={
      uid:parentUid,title:name,content:description||name,createtime:albumTime,
      site:'Facebook',site_id:null,
      searchable:Boolean(description),statistics_able:Boolean(description),
      ...(captions.length?{target_id:captions.map(entry=>entry.row.uid)}:{})
    };
    return [{row:parent,attachments:looseAttachments},...captions];
  }
  const original=archiveGalaxyRow(record);
  if(!original)return [];
  // An Instagram caption belongs to the whole post, not to one picture. It stays
  // in the post's own text and every picture hangs on that post's media_link.
  return [{row:original,attachments:Array.isArray(record.attachments)?record.attachments:[]}];
}
