// Map records from the shared archive scanner to Galaxy's existing text contract.
// Source adapters are hints; every row still needs real text and a stable identity.
import {facebookArchiveGalaxyRow,facebookArchiveUid} from './facebook-backup-place.mjs';
import {repairMojibakeText} from './content-policy.js';

const label={facebook:'Facebook',threads:'Threads',instagram:'Instagram',chatgpt:'ChatGPT',claude:'Claude',
  messenger:'Messenger',x:'X',document:'Document',meta:'Archive'};
const urlOf=value=>{
  if(typeof value!=='string')return '';
  try{
    const u=new URL(value.trim());
    return ['https:','http:'].includes(u.protocol)?u.href:'';
  }catch{return ''}
};
const titleFor=(text,source)=>text.split(/\r?\n/)[0].trim().slice(0,120)||source+' 匯入紀錄';

export function archiveGalaxyRow(record){
  if(!record||record.kind==='unmapped'||!record.key)return null;
  const platform=String(record.platform||'meta').toLowerCase();
  const source=label[platform]||platform.slice(0,64)||'Archive';
  if(platform==='facebook'){
    const row=facebookArchiveGalaxyRow(record);
    if(!row)return null;
    const url=urlOf(record.url);
    return {...row,source_name:'Facebook',...(url?{url}:{})};
  }
  const content=repairMojibakeText(String(record.text||'').trim());
  if(!content)return null;
  const location=repairMojibakeText(String(record.sourcePlace||'').trim());
  const url=urlOf(record.url);
  return {
    uid:facebookArchiveUid('archive:'+record.key),
    title:repairMojibakeText(String(record.title||'').trim()).slice(0,300)||titleFor(content,source),
    content,createtime:record.createdAt||null,
    source_name:source,
    ...(location?{source_place:location}:{}),
    ...(url?{url}:{})
  };
}
