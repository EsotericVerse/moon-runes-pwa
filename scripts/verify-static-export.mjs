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
const indexPath=path.join(out,'index.html');
if(fs.existsSync(indexPath)){
  const html=fs.readFileSync(indexPath,'utf8');

  // Real breakage only: every local image the homepage references must exist.
  // (How images are hashed, preloaded or sized is not a contract.)
  const refs=[...html.matchAll(/<(?:img|source)[^>]+(?:src|srcSet)=["']([^"']+)["']/gi)]
    .map(match=>match[1].split(/\s+/)[0]).filter(url=>url.startsWith('/')&&!url.startsWith('//'));
  for(const asset of new Set(refs))requireFile(asset.replace(/^\//,''));
}

if(failures.length){
  console.error('[static-export] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}

console.log('[static-export] homepage images and public deep-link routes verified');
