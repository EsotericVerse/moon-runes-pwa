// User-initiated, cached place lookup. The public Photon demo is best-effort;
// it must not be treated as a high-volume paid geocoder replacement.
const API='https://photon.komoot.io/api/';
const CACHE_PREFIX='loc-trace-photon-v1:';
const RETAIN_MS=30*24*60*60*1000;
let queue=Promise.resolve();
let nextAt=0;
const norm=value=>String(value||'').trim().normalize('NFKC').toLowerCase();
function cached(k){
 try{
   const item=JSON.parse(window.localStorage.getItem(CACHE_PREFIX+k)||'null');
   if(item&&Date.now()-item.time<RETAIN_MS&&Array.isArray(item.results))return item.results;
 }catch{}
 return null;
}
function cache(k,results){
 try{window.localStorage.setItem(CACHE_PREFIX+k,JSON.stringify({time:Date.now(),results}));}catch{}
}
function simplify(feature){
 const [longitude,latitude]=feature?.geometry?.coordinates||[];
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude))return null;
 const p=feature.properties||{};
 const label=[...new Set([p.name,p.street,p.city,p.state,p.country].filter(Boolean))].join(' · ');
 return {name:String(p.name||''),label:label||'未知地點',longitude,latitude};
}
export function exactTracePlaceMatch(query,match){
 const strip=s=>norm(s).replace(/[\s()（）\-.,·]/g,'');
 return Boolean(strip(query))&&strip(query)===strip(match?.name);
}
export async function searchTracePlaces(query,{signal}={}){
 const q=String(query||'').trim();
 if(q.length<2||q.length>160)throw Error('請輸入 2～160 字地名。');
 const k=norm(q);
 const hit=cached(k);
 if(hit)return hit;
 const work=async()=>{
  if(signal?.aborted)throw Error('搜尋已取消。');
  const delay=Math.max(0,nextAt-Date.now());
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  if(signal?.aborted)throw Error('搜尋已取消。');
  nextAt=Date.now()+1400;
  const url=new URL(API);
  url.searchParams.set('q',q);url.searchParams.set('limit','5');
  const response=await fetch(url.toString(),{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('免費地點服務暫時無法使用（HTTP '+response.status+'）。');
  const json=await response.json();
  const results=(Array.isArray(json.features)?json.features:[]).map(simplify).filter(Boolean);
  cache(k,results);
  return results;
 };
 const run=queue.then(work,work);
 queue=run.catch(()=>{});
 return run;
}
