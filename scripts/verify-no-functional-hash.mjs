import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root=process.cwd();
const failures=[];
const runtimeRoots=['app','js'];

function walk(dir){
  if(!existsSync(dir))return;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory())walk(path);
    else inspect(path);
  }
}

function inspect(path){
  if(!/\.(?:js|jsx|mjs|html)$/.test(path))return;
  const rel=relative(root,path).replaceAll('\\','/');
  const source=readFileSync(path,'utf8');
  const checks=[
    [/\blocation\.hash\b|\bwindow\.location\.hash\b/,'location.hash routing'],
    [/href\s*=\s*(?:\{\s*)?["'`][^"'`]*#[^"'`]*["'`](?:\s*\})?/,'hash href'],
    [/history\.(?:pushState|replaceState)\([^\n]*#[^\n]*\)/,'history-state hash routing']
  ];
  for(const [pattern,label] of checks)if(pattern.test(source))failures.push(`${rel}: ${label}`);
}

for(const dir of runtimeRoots)walk(resolve(root,dir));
for(const name of readdirSync(root).filter(name=>name.endsWith('.html')))inspect(resolve(root,name));

if(failures.length){
  console.error('[functional-hash] forbidden runtime hash routing found:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[functional-hash] runtime navigation uses routes/query state, not hash routing');
