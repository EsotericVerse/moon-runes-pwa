// Keep captions as Galaxy text and media as Galaxy Media records.
// Structural parents represent actual platform media posts but are not user prose.
import {archiveGalaxyRow} from './archive-galaxy-row.mjs';
import {facebookArchiveUid} from './facebook-backup-place.mjs';
import {repairMojibakeText} from './content-policy.js';

const clean=value=>repairMojibakeText(String(value||'').trim());
const captionOf=raw=>Array.isArray(raw?.label_values)?
  clean(raw.label_values.find(item=>clean(item?.label)==='說明文字')?.value):'';

export function archiveGalaxyRows(record){
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
