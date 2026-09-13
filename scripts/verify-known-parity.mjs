import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const failures=[];
const text=path=>readFileSync(resolve(root,path),'utf8');

function requireFile(path){if(!existsSync(resolve(root,path)))failures.push(`missing required file: ${path}`)}
function requireText(path,needles){
  const source=text(path);
  for(const needle of needles)if(!source.includes(needle))failures.push(`${path}: missing ${needle}`);
}
function forbidText(path,needles){
  const source=text(path);
  for(const needle of needles)if(source.includes(needle))failures.push(`${path}: forbidden regression ${needle}`);
}

// Frozen sources and canonical runtime roots.
for(const path of [
  'LunaRune66.xlsx',
  'LunarRunesCardCut.pdf',
  'pics/LOC-FrameworkPic.png',
  'pics/LOC-structure.png',
  'js/runes-core.js',
  'js/galaxy.js',
  'js/writing.js'
]) requireFile(path);
if(existsSync(resolve(root,'lib')))failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

// Homepage: preserve approved lower sections while keeping explicit removals removed.
requireText('app/loc/views/AboutView.jsx',[
  'id="current-progress"',
  'id="framework-map"',
  '/pics/LOC-structure.png',
  '作者的話',
  '/runes#reference'
]);
forbidText('app/loc/views/AboutView.jsx',[
  'Start Here',
  '把方法帶進自己的工作流程',
  'LunaRunes Context Evolution'
]);

// Shared fixed four-line footer.
requireText('app/layout.jsx',[
  'LOC月典(LunaCodex)',
  'By <a href=',
  'Lucas Oscar Wang 政德',
  '意見信箱',
  'in EsotericVerse 秘藝文域（籌備中）'
]);
forbidText('app/loc/LocApp.jsx',['loc-next-footer']);

// Runes known parity requirements restored from the legacy page.
requireText('app/runes/RunesClient.jsx',[
  "key:'daily'",
  '新手上路',
  '占卜抽籤',
  '66 符資料',
  '符文脈絡',
  '符文統計',
  '符文知識庫',
  'id="library"',
  'id="reference"',
  '/LunarRunesCardCut.pdf',
  '真實月相'
]);

// Public staging must retain frozen diagrams and the printable production PDF.
requireText('scripts/prepare-next-public.mjs',[
  "'pics'",
  "'LunarRunesCardCut.pdf'"
]);
requireText('scripts/verify-public-payload.mjs',[
  'pics/LOC-FrameworkPic.png',
  'pics/LOC-structure.png',
  'LunarRunesCardCut.pdf'
]);

if(failures.length){
  console.error('[known-parity] migration regressions found:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[known-parity] known homepage, footer, Runes and frozen-source regressions are guarded');
