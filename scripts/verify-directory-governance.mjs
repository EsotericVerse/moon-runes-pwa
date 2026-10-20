import {existsSync,readdirSync,statSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';

const root=process.cwd();
const failures=[];
const allowedRootDirs=new Set(['.agents','.github','app','assets','pics','public','scripts','supabase','tests']);
for(const name of ['app','assets','pics','public','scripts','supabase','tests']){
  if(!existsSync(resolve(root,name)))failures.push('missing Current root directory: '+name+'/');
}
for(const name of readdirSync(root)){
  const path=resolve(root,name);
  if(statSync(path).isDirectory()&&!allowedRootDirs.has(name)&&!['.git','node_modules','.next','out'].includes(name)){
    failures.push('unowned repository root directory: '+name+'/');
  }
}
function walk(dir,files=[]){
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory()){
      if(['.git','node_modules','.next','out'].includes(name))continue;
      walk(path,files);
    }else files.push(path);
  }
  return files;
}
const files=walk(root);
for(const file of ['LunaRune66.xlsx','LunarRunesCardCut.pdf']){
  if(!existsSync(resolve(root,file)))failures.push('missing LOC 1.0 artifact: '+file);
}
for(const sourceName of ['LunaRune66.xlsx','LunarRunesCardCut.pdf']){
  const matches=files.filter(path=>basename(path)===sourceName);
  if(matches.length!==1)failures.push(sourceName+' must have exactly one Current repository source; found '+matches.length);
  if(matches.length===1&&resolve(matches[0])!==resolve(root,sourceName))failures.push(sourceName+' Current source must be at repository root');
}
if(failures.length){
  console.error('[directory-governance] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[directory-governance] root directories and rune source files verified');
