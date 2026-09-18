import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';

const root=process.cwd();
const failures=[];

const legacyRedirects={
  'runes.html':'https://lrunes.lo3rwang.cc/'
};

for(const [file,canonical] of Object.entries(legacyRedirects)){
  const abs=resolve(root,file);
  if(!existsSync(abs))continue;
  const source=readFileSync(abs,'utf8');
  if(!source.includes(canonical))failures.push(file+' must redirect to canonical '+canonical);
  if(source.includes('https://loc.lo3rwang.cc/runes'))failures.push(file+' still declares retired /runes canonical');
  if(/target\s*=\s*['"]\/runes/.test(source))failures.push(file+' still redirects to retired /runes path');
}

const currentRuntimeRoots=['app','scripts'];
for(const rootName of currentRuntimeRoots){
  const start=resolve(root,rootName);
  if(!existsSync(start))continue;
  const stack=[start];
  while(stack.length){
    const current=stack.pop();
    for(const name of readdirSync(current)){
      const path=join(current,name);
      const stat=statSync(path);
      if(stat.isDirectory()){
        if(['node_modules','.next','out','public'].includes(name))continue;
        stack.push(path);
        continue;
      }
      if(!/\.(?:js|jsx|mjs)$/i.test(name))continue;
      const rel=relative(root,path).replaceAll('\\','/');
      if(rel==='scripts/verify-static-entrypoints.mjs')continue;
      const source=readFileSync(path,'utf8');
      if(/(?:href|action|location(?:\.href|\.replace)?|target)\s*[=:({ ]+\s*['"]\/runes(?:[/?#'"])/.test(source)){
        failures.push(rel+': Current runtime contains retired /runes route');
      }
    }
  }
}

if(failures.length){
  console.error('[static-entrypoints] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[static-entrypoints] no legacy static entrypoint is Current; compatibility redirects point to canonical Scope domains');
