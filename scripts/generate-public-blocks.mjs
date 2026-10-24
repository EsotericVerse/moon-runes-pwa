import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createPublicSupabaseClient} from '../app/api/loc/_server.js';
import {SCOPE_ROUTE_INDEX} from '../app/modular/scope-route-index.js';

// Public Blocks are read once during a deliberate build, not per browser visit.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public','_loc');
const staging=path.join(root,'public','_loc-building');
const cols='uid,page_name,block_eyebrow,block_title,block_subtitle,block_text,block_order,block_entity,block_image';
const known=['index','hero','culture','statics','search','governance',
  'group_culture','group_statics','group_search','scope_culture','scope_statics','scope_search','game'];
const db=createPublicSupabaseClient();
const {data:site,error:siteError}=await db.rpc('read_app_bootstrap',{p_scope_id:'loc',p_page_name:'index'});
if(siteError||!site)throw Error('Cannot publish public Bootstrap: '+String(siteError?.message||'missing'));
const scopes=[...new Set([
  ...SCOPE_ROUTE_INDEX.filter(row=>row.active!==false).map(row=>row.scope_id),
  ...(Array.isArray(site.registry)?site.registry:[]).filter(row=>row.active!==false&&row.scope_kind!=='system').map(row=>row.scope_id)
].map(id=>String(id||'').trim()).filter(id=>/^[a-z][a-z0-9]{0,14}$/.test(id)&&!['local','admin'].includes(id)))].sort();
if(!scopes.length)throw Error('No public Scope routes for Block snapshots');
const digest=createHash('sha256');
fs.rmSync(staging,{recursive:true,force:true});
fs.mkdirSync(staging,{recursive:true});
let files=0;
try{
  const snapshot={...site,blocks:[]};
  const meta=JSON.stringify(snapshot);
  fs.writeFileSync(path.join(staging,'site-bootstrap.json'),meta);
  digest.update('site-bootstrap.json\0'+meta+'\0');
  fs.mkdirSync(path.join(staging,'config'),{recursive:true});
  for(const id of scopes){
    const table=id==='loc'?'loc_config':id;
    const {data:config,error:configError}=await db.from(table)
      .select('id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able')
      .eq('id',id).limit(1).maybeSingle();
    if(configError)throw Error('Cannot publish '+id+' Config: '+configError.message);
    const configJson=JSON.stringify(config||null);
    fs.writeFileSync(path.join(staging,'config',id+'.json'),configJson);
    digest.update('config/'+id+'.json\0'+configJson+'\0');
    const {data,error}=await db.from(id+'_blocks').select(cols)
      .order('block_order',{ascending:true}).range(0,65534);
    if(error)throw Error('Cannot publish '+id+' Blocks: '+error.message);
    const pages=new Map(known.map(name=>[name,[]]));
    for(const row of data||[]){
      const name=String(row.page_name||'index').trim().toLowerCase();
      if(!/^[a-z0-9_-]+$/.test(name))throw Error('Invalid Block page '+id+'/'+name);
      if(!pages.has(name))pages.set(name,[]);
      pages.get(name).push(row);
    }
    fs.mkdirSync(path.join(staging,'blocks',id),{recursive:true});
    for(const [name,rows] of [...pages].sort(([a],[b])=>a.localeCompare(b))){
      const data=JSON.stringify(rows);
      fs.writeFileSync(path.join(staging,'blocks',id,name+'.json'),data);
      digest.update('blocks/'+id+'/'+name+'.json\0'+data+'\0');
      files++;
    }
  }
  // New published content -> new Service Worker bytes -> old caches removed
  // on the standard install/activate cycle, without a remote invalidation API.
  const version=digest.digest('hex').slice(0,16);
  const filename=path.join(root,'public','sw.js');
  const previous=fs.readFileSync(filename,'utf8');
  if(!/const BLOCK_CACHE='loc-public-blocks-[^']+';/.test(previous))
    throw Error('Service Worker Block cache version marker missing');
  const next=previous.replace(/const BLOCK_CACHE='loc-public-blocks-[^']+';/,
    "const BLOCK_CACHE='loc-public-blocks-"+version+"';");
  fs.rmSync(output,{recursive:true,force:true});
  fs.renameSync(staging,output);
  fs.writeFileSync(filename,next);
  console.log('[blocks] '+files+' public JSON snapshots; cache '+version);
}catch(error){
  fs.rmSync(staging,{recursive:true,force:true});
  throw error;
}
