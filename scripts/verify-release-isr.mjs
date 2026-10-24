import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const readJson=file=>JSON.parse(read(file));
const routes=readJson('.next/server/app-paths-manifest.json');

// ISR is limited to public Culture/Statistics numeric data, including
// Rune Daily timelines, media facets and chart range metadata.
const numeric='app/api/loc/scopes/[scopeId]/numeric/[kind]/route.js';
const invalidation='app/api/loc/revalidate/route.js';
const appPath=file=>'/'+file.replace(/^app\//,'').replace(/\.js$/,'');
for(const name of [numeric,invalidation]){
  if(!routes[appPath(name)])throw Error('Missing Next route '+name);
}
for(const route of [
  'app/api/loc/site-bootstrap/route.js',
  'app/api/loc/scopes/[scopeId]/config/route.js',
  'app/api/loc/scopes/[scopeId]/blocks/[pageName]/route.js'
]){
  if(fs.existsSync(path.join(root,route)))throw Error('Legacy ISR route still present: '+route);
}
const source=read(numeric);
if(!source.includes('unstable_cache(')||!source.includes('read_scope_statistics')
  ||!source.includes('read_scope_overview')||!source.includes("Cache-Control':'no-store"))
  throw Error('Missing shared numeric ISR Data Cache or browser-cache bypass');
if(!source.includes("'media_style'")||!source.includes("'daily-earliest'")||!source.includes("'earliest'"))
  throw Error('Numeric ISR misses Media Style or Daily Rune chart data');
const config=read('app/loc/scope-data.js');
if(config.includes("locPublicIsrUrl('/api/loc/site-bootstrap')")||
   config.includes("locPublicIsrUrl('/api/loc/scopes/"))
  throw Error('Non-numeric ISR reference remains in scope-data');
if(!config.includes('/_loc/blocks/')||!config.includes('/_loc/site-bootstrap.json'))
  throw Error('Missing static Blocks/bootstrap data sources');
const app=read('app/loc/app-bootstrap.js');
if(app.includes('locHomeSnapshotDelivered'))
  throw Error('LOC home still consumes site RPC Blocks');
const worker=read('public/sw.js');
if(!worker.includes('loc-public-blocks-')||!worker.includes('LOC_BLOCKS_INVALIDATE'))
  throw Error('Static Block Service Worker is incomplete');
console.log('Verified Culture/Statistics numeric ISR (including Media Style and Daily Rune), plus public SW Blocks/bootstrap.');
