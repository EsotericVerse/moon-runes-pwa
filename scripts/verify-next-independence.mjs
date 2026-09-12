import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root=process.cwd();
const scanRoots=['app','lib'].map(p=>resolve(root,p));
const forbidden=[
  /(?:index|loc|game|context|statics|evolution|search|governance)\.html\b/g,
  /css\/style\.css\b/g,
  /js\/(?:loc2-game|statics-dashboard|rune-daily-records|loc-nav)\.js\b/g
];
const hits=[];

function walk(dir){
  if(!statSync(dir,{throwIfNoEntry:false}))return;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);const stat=statSync(path);
    if(stat.isDirectory())walk(path);
    else if(/\.(?:js|jsx|mjs|css)$/.test(name)){
      const text=readFileSync(path,'utf8');
      for(const rule of forbidden){rule.lastIndex=0;for(const match of text.matchAll(rule))hits.push(`${relative(root,path)}: ${match[0]}`);}
    }
  }
}
scanRoots.forEach(walk);
if(hits.length){console.error('[next-independence] legacy LOC dependencies found:\n'+hits.join('\n'));process.exit(1);}
console.log('[next-independence] no legacy LOC HTML/runtime/CSS dependencies in Next app');
