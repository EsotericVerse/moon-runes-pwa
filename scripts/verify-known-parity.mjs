import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const failures=[];
const text=path=>readFileSync(resolve(root,path),'utf8');

function requireFile(path){if(!existsSync(resolve(root,path)))failures.push(`missing required file: ${path}`)}
function requireText(path,needles){const source=text(path);for(const needle of needles)if(!source.includes(needle))failures.push(`${path}: missing ${needle}`);}
function requireAnyText(path,needles,label){const source=text(path);if(!needles.some(needle=>source.includes(needle)))failures.push(`${path}: missing ${label||needles.join(' / ')}`);}
function forbidText(path,needles){const source=text(path);for(const needle of needles)if(source.includes(needle))failures.push(`${path}: forbidden regression ${needle}`);}

for(const path of [
  'LunaRune66.xlsx','LunarRunesCardCut.pdf','pics/LOC-FrameworkPic.png','pics/LOC-structure.png',
  'js/runes-core.js','js/galaxy.js','js/writing.js','js/rune-graph-core.js'
]) requireFile(path);
if(existsSync(resolve(root,'lib')))failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

// Homepage freeze scope: only block 1 (hero/introduction) and block 2 (beginner start).
// Block 3 and later are intentionally not parity-frozen and may evolve independently.
requireText('app/loc/views/AboutView.jsx',[
  'LOC月典',
  '從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。',
  '/pics/LOC-PicAll.png',
  'Start Here · 新手上路',
  '不知道怎麼開始沒關係，就抽一張牌吧！',
  '那就開始吧！'
]);

requireText('app/layout.jsx',['GlobalNav','GlobalFooter']);
requireText('app/GlobalFooter.jsx',['月典','月之符文','治理','lo3rwang（Lucas Oscar Wang 政德）','秘藝文域（EsotericVerse）（籌備中）']);
forbidText('app/loc/LocApp.jsx',['loc-next-footer']);

requireText('app/runes/RunesClient.jsx',[
  "key:'daily'","key:'ow3gs'",'新手上路','占卜抽籤','符文圖鑑','符文脈絡','符文統計','符文知識庫',
  'id="reference"','真實月相','玄之符文','RITUAL_MESSAGES',
  '每日占卜提醒','愛情建議','事業建議','心理建議','健康建議','生活建議',
  '因 → 果','源 → 轉 → 合','時間主線 × 內外作用','第 7–11 張為核心判定',
  'buildRuneGraph','searchRuneGraph','全部關係','runes-pager','RuneAtlas'
]);
requireText('app/runes/RuneAtlas.jsx',['id="library"','符文圖鑑','/LunarRunesCardCut.pdf','實體卡片印製／裁切 PDF']);
requireAnyText('app/runes/RunesClient.jsx',['不呼叫外部 API','不需要外部 API'],'No API local-processing statement');
requireText('js/rune-graph-core.js',['buildRuneGraph','searchRuneGraph','keyword_of','reverse_keyword_of','ownership','resolved_to']);

requireText('scripts/prepare-next-public.mjs',["'pics'","'LunarRunesCardCut.pdf'"]);
requireText('scripts/verify-public-payload.mjs',['pics/LOC-FrameworkPic.png','pics/LOC-structure.png','LunarRunesCardCut.pdf']);

if(failures.length){console.error('[known-parity] migration regressions found:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1);}
console.log('[known-parity] homepage blocks 1-2, modular footer, Runes, Graph and frozen-source regressions are guarded');
