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
  'LunaRune66.xlsx','LunarRunesCardCut.pdf','pics/LOC-FrameworkPic.png','pics/LOC-structure.png','pics/aboutme.png',
  'js/runes-core.js','js/galaxy.js','js/writing.js','js/rune-graph-core.js'
]) requireFile(path);
if(existsSync(resolve(root,'lib')))failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

// Homepage block 1 remains adjustable while mobile proportions are still being reviewed.
// Homepage block 2 (Start Here) and block 3 (LunaRunes) are frozen and must not change incidentally.
// Block 3 is a fixed reference block and receives priority protection.
// GlobalFooter remains outside this specific homepage block freeze.

requireText('app/loc/views/AboutView.jsx',[
  '<section className="loc-card home-copy-block home-beginner" id="beginner">',
  '<p className="loc-eyebrow">Start Here · 新手上路</p>',
  '<h2>新手上路</h2>',
  '<p className="loc-subtitle">不知道怎麼開始沒關係，就抽一張牌吧！</p>',
  '不用管符文是什麼，抽了就知道！可以是問事，可以是生活風格主題的每日符文。',
  '抽到之後再看當下的文字、方向與說明就可以；想多了解一點，再慢慢往下看。',
  '你也可以完全不抽牌，直接在符文面跳過，往下看或看上面連結的脈絡、統計、文化，<br/>或直接搜尋自己有興趣的文字與資料。',
  '<p><strong>那就開始吧！</strong></p>',
  '<a className="loc-button primary" href="/runes">抽牌</a>',
  '<a className="loc-button" href="/statics">排行榜</a>',
  '<img src="/pics/LOC-FrameworkPic.png" alt="LOC 框架步驟圖" loading="lazy" />',
  '<section className="loc-card home-copy-block home-rune-section">',
  '<p className="loc-eyebrow">LunaRunes · 月之符文</p>',
  '<h2>符文籤詩系統</h2>',
  '<p className="loc-subtitle">問一件事，或讓語言自己成長</p>',
  '<div className="home-rune-preview" aria-label="命之符文示例">',
  '<img src="/assets/lunarunes/cards/66_命.png" alt="命之符文" />',
  '<div className="home-rune-card-title"><strong>命之符文</strong><span className="home-rune-glyph">⟁</span><span>(Fate)</span></div>',
  '<p>定論的所有可能 / 命定者</p>',
  '<p>正面：定論、必然、法則</p>',
  '<p>負面：—</p>',
  '<p>所屬分組：特殊 / 卡片屬性：未知</p>',
  '<p>卡片月相：無 / 真實月相：空亡</p>',
  '<p className="home-rune-direction">卡片面向：<strong>正位</strong></p>',
  '不知道怎麼說的話，<a href="/runes">抽牌</a>就對了！',
  '月之符文的66符文字會給你提示籤詩，指引你的未知路線方式。',
  '抽牌讓這語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。',
  '<a className="loc-bubble" href="/runes?mode=single">抽單張</a>',
  '<a className="loc-bubble" href="/runes?mode=daily">抽每日指示</a>',
  '<a className="loc-bubble" href="/runes?mode=2card">抽兩張</a>',
  '<a className="loc-bubble" href="/runes?mode=3card">抽三張</a>',
  '<a className="loc-bubble" href="/runes?mode=5card">抽五張</a>',
  '<a className="loc-bubble" href="/runes?mode=ow3gs">抽11張</a>',
  '<a className="loc-button" href="/runes#library">符文圖鑑</a>',
  '<a className="loc-button" href="/governance">符文規則</a>',
  '<a className="loc-button" href="/runes#reference">符文脈絡</a>'
]);

requireText('app/styles/home-content.css',[
  '.home-beginner .home-rune-layout{',
  'grid-template-columns:minmax(0,1.38fr) minmax(0,1fr);',
  '.home-beginner .home-framework-figure{',
  '.home-beginner .home-framework-figure img{'
]);

requireText('app/layout.jsx',['GlobalNav','GlobalFooter']);
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
console.log('[known-parity] Runes, Graph, protected sources, and homepage blocks 2-3 are guarded; block 3 is fixed');
