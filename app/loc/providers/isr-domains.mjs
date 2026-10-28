// Portable ISR domain registry. Names and origins are data, not platform logic.
// No proxying, credential forwarding, health checks or automatic failover.
export const MAX_ISR_DOMAINS=32;
const DOMAIN_ID=/^[a-z][a-z0-9-]{0,31}$/;

export function normalizeIsrDomain(entry,{allowEmptyOrigin=false}={}){
  const id=String(entry?.id||'').trim().toLowerCase();
  const label=String(entry?.label||'').trim();
  const raw=String(entry?.origin||'').trim();
  if(!DOMAIN_ID.test(id))throw new Error('ISR ID 須為 1–32 字的小寫英數及連字號，且以字母開頭。');
  if(!label||label.length>80)throw new Error('ISR 名稱須為 1–80 字。');
  if(raw.length>512)throw new Error('ISR Domain 長度不可超過 512 字。');
  if(!raw&&allowEmptyOrigin)return {id,label,origin:''};
  let url;
  try{url=new URL(raw);}catch{throw new Error('ISR Domain 必須是有效的 HTTPS 網域。');}
  if(url.protocol!=='https:'||url.username||url.password||
    url.search||url.hash||url.pathname!=='/'||url.port||
    !url.hostname.includes('.')||url.hostname==='localhost'||
    url.hostname.endsWith('.localhost')||/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(url.hostname)||
    url.hostname.includes(':')){
    throw new Error('ISR Domain 僅接受公開 HTTPS 網域，不可含路徑、參數、帳密或連接埠。');
  }
  return {id,label,origin:url.origin};
}

export function normalizeIsrDomains(entries,selectedId,options={}){
  if(!Array.isArray(entries)||entries.length<1||entries.length>MAX_ISR_DOMAINS)
    throw new Error('ISR Domain 至少保留一筆，最多 32 筆。');
  const rows=entries.map(entry=>normalizeIsrDomain(entry,options));
  if(new Set(rows.map(row=>row.id)).size!==rows.length)
    throw new Error('ISR ID 不可重複。');
  const origins=rows.map(row=>row.origin.toLowerCase()).filter(Boolean);
  if(new Set(origins).size!==origins.length)
    throw new Error('ISR Domain 不可重複。');
  if(!rows.some(row=>row.id===selectedId))
    throw new Error('請手動選擇已儲存清單中的 ISR Domain。');
  return rows;
}
