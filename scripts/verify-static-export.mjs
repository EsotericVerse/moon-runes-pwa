import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'out');
const failures=[];

function requireFile(relative){
  const target=path.join(out,relative);
  if(!fs.existsSync(target))failures.push('missing static export route/file: '+relative);
}

for(const route of [
  'index.html',
  'lo3rwang/index.html',
  'statics/index.html',
  'culture/index.html',
  'search/index.html',
  'governance/index.html',
  'scope/index.html',
  'settings/index.html',
  'scope/search/index.html',
  'scope/statics/index.html',
  'scope/culture/index.html',
  'scope/governance/index.html',
  'scope/governance/manage/index.html',
  '404.html'
])requireFile(route);

const notFoundPath=path.join(out,'404.html');
if(fs.existsSync(notFoundPath)){
  const html=fs.readFileSync(notFoundPath,'utf8');
  if(!html.includes('https://loc.lo3rwang.cc/'))failures.push('404 export must redirect to LOC homepage');
  if(!html.includes('current.origin===home.origin'))failures.push('404 redirect must retain the LOC homepage loop guard');
}

const indexPath=path.join(out,'index.html');
if(fs.existsSync(indexPath)){
  const html=fs.readFileSync(indexPath,'utf8');

  if(/<link[^>]+rel=["']preload["'][^>]+as=["']image["']/i.test(html)||
     /<link[^>]+as=["']image["'][^>]+rel=["']preload["']/i.test(html)){
    failures.push('LOC homepage must not preload image assets; one responsive image request is the contract');
  }

  for(const stale of [
    '/pics/LOC-PicAll.png',
    '/pics/LunaRunes.png',
    '/pics/ChaosGalaxy.png',
    '/pics/aboutme.png'
  ]){
    if(html.includes(stale))failures.push('LOC homepage still exposes legacy unversioned image URL: '+stale);
  }

  if(/<img[^>]+loading=["']eager["']/i.test(html)){
    failures.push('LOC homepage contains eager image loading; keep homepage images lazy to prevent React image preload duplication');
  }

  const hero=html.match(/<img[^>]+src=["']([^"']*LOC-PicAll\.[^"']+\.png)["']/i)?.[1]||'';
  const mobile=html.match(/<source[^>]+srcSet=["']([^"']*LOC-PicAll_s\.[^"']+\.png)["']/i)?.[1]||'';
  const og=html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]||'';

  if(!hero)failures.push('LOC homepage hashed desktop hero asset not found');
  if(!mobile)failures.push('LOC homepage hashed mobile hero asset not found');
  if(!og)failures.push('LOC Open Graph image not found');

  if(hero&&og){
    try{
      const ogPath=new URL(og).pathname;
      if(ogPath!==hero)failures.push('LOC hero and Open Graph image must share the same content-hashed asset URL');
    }catch{
      failures.push('LOC Open Graph image URL is invalid');
    }
  }

  for(const asset of [hero,mobile].filter(Boolean)){
    requireFile(asset.replace(/^\//,''));
  }
}

if(failures.length){
  console.error('[static-export] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}

console.log('[static-export] LOC image identity, lazy loading and public deep-link routes verified');
