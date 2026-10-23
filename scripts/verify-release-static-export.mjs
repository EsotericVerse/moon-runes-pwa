import {existsSync,statSync} from 'node:fs';
import {join} from 'node:path';

// Static export must contain the principal Guest and management mounts.
// This checks file generation only; browser behavior and RLS need separate tests.
const routes=[
  '', 'search', 'culture', 'statics',
  'lo3rwang', 'lo3rwang/search',
  'lrunes', 'lrunes/search', 'lrunes/game', 'game/room',
  'scope-shell', 'scope-shell/search',
  'admin', 'governance/manage', 'governance/manage/search',
  'local/settings'
];
const root=process.argv[2]||'out';
const missing=routes.filter(route=>{
  const path=join(root,route,'index.html');
  return !existsSync(path)||!statSync(path).isFile()||statSync(path).size===0;
});
if(missing.length){
  console.error('Missing or empty static exports:',missing.map(route=>'/'+route+'/').join(', '));
  process.exitCode=1;
}else console.log('Verified '+routes.length+' Guest and Admin static route exports.');
