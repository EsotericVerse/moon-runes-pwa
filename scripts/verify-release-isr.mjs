import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const manifest=readJson('.next/prerender-manifest.json');
const appPaths=readJson('.next/server/app-paths-manifest.json');
const expected=1209600;
for(const route of ['/','/api/loc/site-bootstrap']){
  const value=manifest.routes?.[route]?.initialRevalidateSeconds;
  if(value!==expected)throw new Error(`${route} ISR expected ${expected}s; received ${value}`);
}
for(const route of [
  '/api/loc/scopes/[scopeId]/config/route',
  '/api/loc/scopes/[scopeId]/blocks/[pageName]/route',
  '/api/loc/revalidate/route'
]){
  if(!appPaths[route])throw new Error(`Missing Next route: ${route}`);
}
console.log('Verified 14-day shell and site-bootstrap ISR plus on-demand Scope metadata routes.');
