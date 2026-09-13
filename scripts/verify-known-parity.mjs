import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const failures=[];
const text=path=>readFileSync(resolve(root,path),'utf8');

function requireFile(path){if(!existsSync(resolve(root,path)))failures.push(`missing required file: ${path}`)}
function requireText(path,needles){const source=text(path);for(const needle of needles)if(!source.includes(needle))failures.push(`${path}: missing ${needle}`);}
function forbidText(path,needles){const source=text(path);for(const needle of needles)if(source.includes(needle))failures.push(`${path}: forbidden regression ${needle}`);}

for(const path of [
  'LunaRune66.xlsx','LunarRunesCardCut.pdf','pics/LOC-FrameworkPic.png','pics/LOC-structure.png',
  'js/runes-core.js','js/galaxy.js','js/writing.js','js/rune-graph-core.js'
]) requireFile(path);
if(existsSync(resolve(root,'lib')))failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

requireText('app/loc/views/AboutView.jsx',['id="current-progress"','id="framework-map"','/pics/LOC-structure.png','作者的話','/runes#reference']);
forbidText('app/loc/views/AboutView.jsx',['Start Here','把方法帶進自己的工作流程','LunaRunes Context Evolution']);

requireText('app/layout.jsx',['LOC月典(LunaCodex)','By <a href=','Lucas Oscar Wang 政德','意見信箱','in EsotericVerse 秘藝文域（籌備中）']);
forbidText('app/loc/LocApp.jsx',['loc-next-footer']);

requireText('app/runes/RunesClient.jsx',[
  "key:'daily'","key:'ow3gs'",'新手上路','占卜抽籤','66 符資料','符文脈絡','符文統計','符文知識庫',
  'id="library"','id="reference"','/LunarRunesCardCut.pdf','真實月相','玄之符文','RITUAL_MESSAGES',
  '每日占卜提醒','愛情建議','事業建議','心理建議','健康建議','生活建議',
  '因 → 果','源 → 轉 → 合','時間主線 × 內外作用','第 7–11 張為核心判定',
  'buildRuneGraph','searchRuneGraph','全部關係','runes-pager','不呼叫外部 API'
]);
requireText('js/rune-graph-core.js',['buildRuneGraph','searchRuneGraph','keyword_of','reverse_keyword_of','ownership','resolved_to']);

requireText('scripts/prepare-next-public.mjs',["'pics'","'LunarRunesCardCut.pdf'"]);
requireText('scripts/verify-public-payload.mjs',['pics/LOC-FrameworkPic.png','pics/LOC-structure.png','LunarRunesCardCut.pdf']);

if(failures.length){console.error('[known-parity] migration regressions found:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1);}
console.log('[known-parity] known homepage, footer, Runes, Graph and frozen-source regressions are guarded');
