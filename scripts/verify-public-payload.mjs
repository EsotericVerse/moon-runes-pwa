import {existsSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const publicRoot=resolve(root,'public');
const failures=[];
function walk(dir,out=[]){if(!existsSync(dir))return out;for(const name of readdirSync(dir)){const path=resolve(dir,name);const stat=statSync(path);if(stat.isDirectory())walk(path,out);else out.push(path);}return out;}
if(existsSync(resolve(root,'data/json')))failures.push('runtime data/json directory must be removed');
for(const file of walk(publicRoot)){const rel=file.slice(publicRoot.length+1).replaceAll('\\','/');if(rel.startsWith('data/json/')||rel==='loc-data-index.json'||rel==='loc-data-version.json')failures.push(`stale runtime payload: public/${rel}`);}
for(const rel of ['scope-route-policy.json','manifest.json','data/html/runes-beginner.html'])if(!existsSync(resolve(publicRoot,rel)))failures.push(`missing public asset: ${rel}`);
if(failures.length){console.error('[public-payload] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[public-payload] verified Neon-only public payload with no runtime JSON');
