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

const cardDirectory=path.join(out,'assets/lunarunes/cards');
const expectedRuneCards=Array.from({length:66},(_,index)=>String(index+1).padStart(2,'0')+'.png').sort();
if(!fs.existsSync(cardDirectory))failures.push('missing canonical Rune image directory');
else{
  const actual=fs.readdirSync(cardDirectory).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expectedRuneCards))
    failures.push('export must contain exactly 01.png–66.png and no obsolete Rune image names');
  for(const name of expectedRuneCards){
    const source=path.join(cardDirectory,name);
    if(!fs.existsSync(source))continue;
    if(fs.readFileSync(source).subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
      failures.push('invalid Rune PNG signature '+name);
  }
}
const notFoundPath=path.join(out,'404.html');
if(fs.existsSync(notFoundPath)){
  const html=fs.readFileSync(notFoundPath,'utf8');
  if(!html.includes('https://loc.lo3rwang.cc/'))failures.push('404 export must redirect to LOC homepage');
  if(!html.includes('current.origin===home.origin'))failures.push('404 redirect must retain the LOC homepage loop guard');
  if(!html.includes("current.protocol==='capacitor:'")||!html.includes('/index.html?loc_direct=1'))
    failures.push('Native 404 must return to its bundled LOC homepage');
}

const indexPath=path.join(out,'index.html');
if(fs.existsSync(indexPath)){
  const html=fs.readFileSync(indexPath,'utf8');

  if(/<link[^>]+rel=["']preload["'][^>]+as=["']image["']/i.test(html)||
     /<link[^>]+as=["']image["'][^>]+rel=["']preload["']/i.test(html)){
    failures.push('LOC homepage must not preload image assets; one responsive image request is the contract');
  }

  for(const stale of [
    '/pics/LOC-PicAll.webp',
    '/pics/LunaRunes.webp',
    '/pics/ChaosGalaxy.webp',
    '/pics/aboutme.webp'
  ]){
    if(html.includes(stale))failures.push('LOC homepage still exposes legacy unversioned image URL: '+stale);
  }

  if(/<img[^>]+loading=["']eager["']/i.test(html)){
    failures.push('LOC homepage contains eager image loading; keep homepage images lazy to prevent React image preload duplication');
  }

  const hero=html.match(/<img[^>]+src=["']([^"']*LOC-PicAll\.[^"']+\.webp)["']/i)?.[1]||'';
  const mobile=html.match(/<source[^>]+srcSet=["']([^"']*LOC-PicAll_s\.[^"']+\.webp)["']/i)?.[1]||'';
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
