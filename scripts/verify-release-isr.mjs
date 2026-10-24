import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=readJson('.next/prerender-manifest.json');
const appPaths=readJson('.next/server/app-paths-manifest.json');
const expected=1209600;

// The shell is prerendered. Route handlers can be dynamic while the READS
// inside unstable_cache still have the full 14-day persistent Data Cache.
// Do not demand a prerender-manifest entry for dynamic Route Handlers.
if(manifest.routes?.['/']?.initialRevalidateSeconds!==expected){
  throw new Error('LOC shell prerender TTL must remain 14 days');
}

const server=read('app/api/loc/_server.js');
if(!/LOC_ISR_SECONDS\s*=\s*1209600/.test(server))
  throw new Error('ISR metadata Data Cache TTL is not 14 days');

for(const file of [
  'app/api/loc/site-bootstrap/route.js',
  'app/api/loc/scopes/[scopeId]/config/route.js',
  'app/api/loc/scopes/[scopeId]/blocks/[pageName]/route.js'
]){
  const appPath='/'+file.replace(/^app\//,'').replace(/\.js$/,'');
  if(!appPaths[appPath])throw new Error('Missing Next API route: '+appPath);
  const source=read(file);
  if(!/unstable_cache\s*\(/.test(source)||!/revalidate:\s*LOC_ISR_SECONDS/.test(source))
    throw new Error('Missing 14-day cached database read in '+file);
  if(!/tags:\s*\[LOC_PUBLIC_CACHE_TAG\]/.test(source))
    throw new Error('Missing on-demand invalidation tag in '+file);
}
if(!appPaths['/api/loc/revalidate/route'])
  throw new Error('Missing authenticated metadata invalidation route');
const invalidation=read('app/api/loc/revalidate/route.js');
if(!invalidation.includes('revalidateTag(LOC_PUBLIC_CACHE_TAG,{expire:0})'))
  throw new Error('Missing authorized cache invalidation');

console.log('Verified 14-day shell ISR, 14-day cached API data, and authorized tag invalidation.');
