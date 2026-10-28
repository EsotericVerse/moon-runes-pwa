// ISR destinations are named HTTPS origins, not deployment providers or DNS records.
export const MAX_ISR_DOMAINS=32;

export function normalizeIsrDomain(entry,{allowEmptyOrigin=false}={}){
  const label=String(entry?.label||'').trim();
  const raw=String(entry?.origin||'').trim();
  if(!label||label.length>80)throw new Error('名稱須為 1–80 字。');
  if(raw.length>512)throw new Error('Domain 長度不可超過 512 字。');
  if(!raw&&allowEmptyOrigin)return {label,origin:''};
  let url;
  try{url=new URL(raw);}catch{throw new Error('Domain 必須是有效的 HTTPS 網址。');}
  if(url.protocol!=='https:'||url.username||url.password||
    url.search||url.hash||url.pathname!=='/'||url.port||
    !url.hostname.includes('.')||url.hostname==='localhost'||
    url.hostname.endsWith('.localhost')||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)||
    url.hostname.includes(':')){
    throw new Error('Domain 僅接受完整 HTTPS 網址，不可包含路徑、參數或連接埠。');
  }
  return {label,origin:url.origin};
}

export function normalizeIsrDomains(entries,{allowEmptyOrigin=false}={}){
  if(!Array.isArray(entries)||entries.length>MAX_ISR_DOMAINS)
    throw new Error('ISR Domain 最多 32 筆。');
  const rows=entries.map(entry=>normalizeIsrDomain(entry,{allowEmptyOrigin}));
  const origins=rows.map(row=>row.origin.toLowerCase()).filter(Boolean);
  if(new Set(origins).size!==origins.length)
    throw new Error('Domain 不可重複。');
  return rows;
}
