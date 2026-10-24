// Explicit one-time / authorized-edit sync of PUBLIC silver.loc URL routing.
// Never run during application startup, ordinary builds, or guest navigation.
// Uses the existing safe public Bootstrap RPC, never direct SELECT silver.loc.
// Requires the public Supabase URL and publishable key (no service role).
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'');
const key=String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'');
if(!url||!key)throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to sync public Scope routes');

const response=await fetch(url+'/rest/v1/rpc/read_app_bootstrap',{
  method:'POST',
  headers:{
    apikey:key,
    Authorization:'Bearer '+key,
    'Content-Type':'application/json',
    'Content-Profile':'silver',
    'Accept-Profile':'silver'
  },
  body:JSON.stringify({p_scope_id:'loc',p_page_name:'index'})
});
if(!response.ok)throw new Error('Public Bootstrap RPC unavailable: HTTP '+response.status);
const payload=await response.json();
const rows=payload?.registry;
if(!Array.isArray(rows)||rows.length===0)throw new Error('Cannot overwrite routes with an empty or invalid public Scope registry');

const ids=new Set();
const publicUrls=new Set();
const snapshot=rows.map(row=>{
  const id=String(row.scope_id||'').trim().toLowerCase();
  const domain=row.domain==null?null:String(row.domain).trim().toLowerCase();
  const directory=row.directory==null?null:String(row.directory).trim();
  const active=row.active!==false;
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id)||ids.has(id))throw new Error('Invalid/duplicate Scope ID: '+id);
  if(Boolean(domain)===Boolean(directory))throw new Error('Scope requires exactly one Domain or Directory: '+id);
  if(domain&&!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(domain))throw new Error('Invalid Scope Domain: '+id);
  if(directory&&(!/^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/?$/.test(directory)||directory==='/'))throw new Error('Invalid Scope Directory: '+id);
  const address=domain?'https://'+domain:'https://loc.lo3rwang.cc'+directory.replace(/\/$/,'');
  if(active&&publicUrls.has(address))throw new Error('Duplicate public Scope URL: '+address);
  if(active)publicUrls.add(address);
  ids.add(id);
  return {scope_id:id,domain,directory,active};
}).sort((a,b)=>a.scope_id.localeCompare(b.scope_id,'en'));

const source='// Generated from PUBLIC silver.loc routing fields by an explicit sync.\n'
  +'// Normal page loads and builds MUST NOT query the database for routes.\n'
  +'// Only regenerate after authorized Scope Domain/Directory changes.\n'
  +'export const SCOPE_ROUTE_INDEX=Object.freeze([\n'
  +snapshot.map(row=>'  Object.freeze('+JSON.stringify(row)+')').join(',\n')
  +'\n]);\n';
const output=fileURLToPath(new URL('../app/modular/scope-route-index.js',import.meta.url));
writeFileSync(output,source);
console.log('Wrote public Scope URL routes: '+snapshot.length+' scopes');
