// Explicit PUBLIC content publishing only. Never call from prebuild or on a visit.
// Run npm run sync:public after authorized public content/config/theme edits,
// review generated files, commit and deploy normally (no build-time SQL).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPublicSupabaseClient} from '../app/api/loc/_server.js';
import {THEME_TOKEN_KEYS} from '../app/modular/theme-registry.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=relative=>path.join(root,relative);
const validScope=/^[a-z][a-z0-9]{0,14}$/;
const validPage=/^[a-z0-9_-]+$/;
const encode=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const db=createPublicSupabaseClient();
const {data:site,error:siteError}=await db.rpc('read_app_bootstrap',{p_scope_id:'loc',p_page_name:'index'});
if(siteError||!site||!Array.isArray(site.registry))throw Error('Cannot publish public Bootstrap');
const routes=site.registry.filter(x=>x.active!==false&&x.scope_kind!=='system');
if(!routes.length||routes.some(x=>!validScope.test(x.scope_id)))throw Error('Invalid public Scope list');
const allBlocks=new Map(),routeConfigs=[];
const cols='uid,page_name,block_eyebrow,block_title,block_subtitle,block_text,block_order,block_entity,block_image';
for(const row of routes){
  const id=row.scope_id,table=id==='loc'?'loc_config':id;
  const {data:config,error:configError}=await db.from(table)
    .select('id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able')
    .eq('id',id).limit(1).maybeSingle();
  if(configError||!config)throw Error('Missing published Scope Config for '+id);
  routeConfigs.push({scope_id:id,domain:row.domain||null,directory:row.directory||null,active:true,config});
  const {data:blocks,error:blocksError}=await db.from(id+'_blocks').select(cols).order('block_order').range(0,65534);
  if(blocksError)throw Error('Blocks unavailable for '+id+': '+blocksError.message);
  for(const block of blocks||[]){
    const page=String(block.page_name||'').trim().toLowerCase();
    if(!validPage.test(page))throw Error('Invalid published page '+id+': '+page);
    const key=id+'/'+page;
    if(!allBlocks.has(key))allBlocks.set(key,[]);
    allBlocks.get(key).push(block);
  }
}
const themeCols=['theme_id','theme_name','theme_order','scheme','style_key','identity_color',...THEME_TOKEN_KEYS.map(key=>key.slice(2).replaceAll('-','_'))].join(',');
const {data:themes,error:themesError}=await db.from('loc_theme').select(themeCols).order('theme_order').limit(8);
if(themesError||themes?.length!==8)throw Error('Cannot publish eight complete LOC Themes');
const palettes=themes.map(theme=>{
  const id=Number(theme.theme_id);
  if(!Number.isInteger(id)||id<1||id>8)throw Error('Invalid Theme ID');
  const declarations=THEME_TOKEN_KEYS.map(key=>{
    const value=String(theme[key.slice(2).replaceAll('-','_')]??'').trim();
    if(!value||/[;{}<>\\]/.test(value)||/url\s*\(|@import|!important/i.test(value)||/[\x00-\x1f]/.test(value))
      throw Error('Unsafe Theme token '+id+' '+key);
    return '  '+key+':'+value+';';
  });
  return ':root[data-theme-id="theme-'+id+'"]{\n  color-scheme:'+(theme.scheme==='dark'?'dark':'light')+';\n'+declarations.join('\n')+'\n}';
});
const themeMeta=themes.map(t=>({theme_id:t.theme_id,theme_name:t.theme_name,theme_order:t.theme_order}));
const bootstrap={scope_id:'loc',page_name:'index',registry:site.registry,page_copy:site.page_copy||[],theme_list:themeMeta,themes:[],blocks:[]};
const entries=[
  ['app/modular/scope-route-index.js','// PUBLIC Scope routing + Config; explicit publication only.\nexport const SCOPE_ROUTE_INDEX=Object.freeze('+encode(routeConfigs)+');\n'],
  ['app/modular/published-site-bootstrap.js','// PUBLIC navigation metadata; Theme values live in CSS.\nexport const PUBLISHED_SITE_BOOTSTRAP=Object.freeze('+encode(bootstrap)+');\n'],
  ['app/modular/published-theme-meta.js','// Published Theme metadata (palettes are CSS).\nexport const PUBLISHED_THEME_META='+encode(themes.map(t=>['theme-'+t.theme_id,t.theme_name,t.scheme,t.style_key]))+';\n'],
  ['app/styles/published-themes.css','/* Published Theme palette; explicit publication only. */\n'+palettes.join('\n\n')+'\n']
];
const manifest=[];
for(const [key,blocks] of [...allBlocks].sort(([a],[b])=>a.localeCompare(b))){
  const [scope,page]=key.split('/');
  entries.push(['app/modular/published-blocks/'+key+'.js',
    '// Public '+key+' Blocks.\nexport default '+encode(blocks)+';\n']);
  manifest.push('  '+JSON.stringify(scope+':'+page)+':()=>import(\'./'+key+'.js\')');
}
entries.push(['app/modular/published-blocks/index.js',
  '// Page-level lazy-load manifest; no runtime database reads.\nconst LOADERS={\n'+manifest.join(',\n')+'\n};\n'+
  'export async function loadPublishedBlocks(scopeId,pageName=\'index\'){\n'+
  '  const key=String(scopeId||\'\')+\':\'+String(pageName||\'index\');\n'+
  '  const load=Object.prototype.hasOwnProperty.call(LOADERS,key)?LOADERS[key]:null;\n'+
  '  return load?(await load()).default:[];\n}\n']);
// All reads and validation succeed before mutating any published files.
const blocksDir=target('app/modular/published-blocks');
const tempDir=target('app/modular/published-blocks-staging');
fs.rmSync(tempDir,{recursive:true,force:true});
fs.mkdirSync(tempDir,{recursive:true});
try{
  for(const [file,content] of entries){
    const dest=file.startsWith('app/modular/published-blocks/')
      ?path.join(tempDir,file.slice('app/modular/published-blocks/'.length))
      :target(file);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,content,'utf8');
  }
  fs.rmSync(blocksDir,{recursive:true,force:true});
  fs.renameSync(tempDir,blocksDir);
  console.log('[public] '+routes.length+' Scope routes + Config, '+allBlocks.size+' page JS modules, '+themes.length+' CSS palettes. Commit generated files before deploying.');
}catch(error){fs.rmSync(tempDir,{recursive:true,force:true});throw error;}
