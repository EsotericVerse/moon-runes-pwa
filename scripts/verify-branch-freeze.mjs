import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const registry=JSON.parse(readFileSync(resolve(root,'governance/frozen-branches.json'),'utf8'));
const branch=String(process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||'').trim();

if(!branch){
  console.log('[branch-freeze] no branch context; skip');
  process.exit(0);
}
if(registry.active.includes(branch)){
  console.log('[branch-freeze] active branch:',branch);
  process.exit(0);
}
if(registry.frozen.includes(branch)){
  console.error('[branch-freeze] branch is frozen:',branch);
  console.error('[branch-freeze] historical branch only; start new work from latest main.');
  process.exit(1);
}
console.log('[branch-freeze] branch is not frozen:',branch);
