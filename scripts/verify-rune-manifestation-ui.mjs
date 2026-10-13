import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const page=read('app/card3d/list/page.jsx'),list=read('app/lrunes/Rune3DLibrary.jsx');
const stage=read('app/lrunes/effekseer/EffekseerStage.jsx');
const twoD=read('app/card/list/page.jsx');
assert.match(page,/RuneUnifiedView/);
assert.match(page,/feature="list" defaultView="3d"/);
const unified=read('app/lrunes/RuneUnifiedView.jsx');
assert.match(unified,/import\('\.\/Rune3DLibrary'\)/,
  '3D atlas content remains the original standalone professional effect gallery');
assert.match(unified,/import\('\.\/list2\/RuneAtlasLab'\)/,
  'switching 2D retains original-art atlas rather than replacing its data');
assert.match(unified,/feature='duel'/);
assert.match(list,/limit:67,offset:0/);
assert.match(list,/next.length!==66/);
assert.match(list,/RuneArtStage mode="groups"/,'3D atlas must show nine original group artworks');
assert.match(list,/RuneArtStage mode="runes"/,'selected group must expand its original rune-card gallery');
assert.match(list,/<EffekseerStage key=\{current\.rune_id\+'-'\+playback\} rune=\{current\}/,'the selected rune can replay the original 3D effect before showing its text');
assert.match(list,/selectGroup/);
assert.match(list,/groupImage\(group\.id\)/,'original full-resolution group painting must expand');
assert.match(list,/silver\.runes_group/,'group text is sourced from canonical Supabase via existing query module');
assert.match(list,/const \[groupId,setGroupId\]=useState\(null\)/,'enter on nine artworks, not an auto-selected rune');
assert.match(list,/const \[focusId,setFocusId\]=useState\(null\)/,'the 3D stage activates only when a rune card is selected');
assert.match(list,/backToGroups/,'image gallery needs back navigation');
assert.match(list,/onSelect=\{jumpTo\}/,'card imagery, not plain glyph tile, selects the 3D stage');
assert.match(list,/const GROUPS=Object\.freeze/);
assert.doesNotMatch(list,/const DIRECTIONS=Object\.freeze/,'atlas has no directional presets');
assert.doesNotMatch(list,/rune-3d-orientation-selector/,'orientation selector belongs to drawing, not gallery');
assert.doesNotMatch(list,/direction=\{direction\}/,'atlas rune playback has intrinsic coloring only');
assert.match(list,/<RuneCardInfo card=\{current\} imageSrc=\{runeImage\(current\)\} layout="home" expandKeywords\/>/,'post-VFX text uses the homepage left card, showing keywords immediately');
assert.match(list,/rune-3d-atlas-reading-details/,'the complete original details are part of the post-effect stage');
for(const field of ['char_action','extra_rules','extra_notes','rune_evolution_history','myth_story','soul_question','practice_challenge','ritual_advice','harmony_advice'])assert.ok(list.includes('current.'+field),'immediately readable extended field missing: '+field);
assert.doesNotMatch(list,/閱讀完整資料|閱讀符文資料/,'never require a second click to read full details');
assert.doesNotMatch(list,/setDetails\(/,'3D gallery does not open a redundant nested details dialog');
assert.match(stage,/disabled=\{!onGlyphClick\}/,'presentation-only 3D glyph is not an inert button');
assert.match(list,/onPlaybackComplete=\{\(\)=>setShowCardInfo\(true\)\}/,'canonical text surfaces after authored VFX stops');
assert.match(list,/showCardInfo\?<motion\.div/,'post-VFX reading is a visible within-stage overlay');
assert.match(list,/setShowCardInfo\(false\)/,'switching runes resets playback and reading');
const info=read('app/lrunes/RuneCardInfo.jsx');
assert.match(info,/expandKeywords=false/,'other homepage and atlas uses retain original keywords presentation');
const art=read('app/lrunes/visual/RuneArtStage.jsx');
const twoDAtlas=read('app/lrunes/list2/RuneAtlasLab.jsx');
assert.match(info,/layout==='home'/,'canonical left homepage card renderer must be retained');
assert.match(info,/所屬分組：/);
assert.match(info,/卡片屬性：/);
assert.match(info,/卡片月相：/);
assert.match(art,/<RuneCardInfo card=\{item\} imageSrc=\{url\} layout="home"/,'both galleries display all canonical attributes in the listing');
assert.match(art,/rune-art-rune-detail-tile/,'gallery cards must not be title-only buttons');
assert.match(twoDAtlas,/<RuneCardInfo card=\{rune\} imageSrc=\{runeImage\(rune\)\} layout="profile"/,'2D details restore old directory presentation');
assert.doesNotMatch(twoDAtlas,/九曜星域/,'2D gallery should no longer imply a star map');
assert.match(stage,/onPlaybackCompleteRef\.current\?\.\(\)/,'Effekseer renderer signals completion when its actual clip finishes');
assert.match(list,/const ids=new Set/);
assert.match(list,/id>=1&&id<=66/);
assert.match(stage,/vfxOnly=false/);
assert.match(stage,/direction=null/);
assert.match(list,/stepRune\(-1\)/);
assert.match(list,/stepRune\(1\)/);
assert.doesNotMatch(list,/退回 7 枚|快速驗收|測試版本/);
assert.doesNotMatch(list,/DEMO\[0\]|現成效果試播/);
assert.match(stage,/runeGlyphProfile\(rune\)/);
assert.match(twoD,/RuneAtlasLab/);
const drawModal=read('app/lrunes/Rune3DPreview.jsx');
const drawCss=read('app/lrunes/effekseer/effekseer-stage.css');
assert.match(drawModal,/import \{createPortal\} from 'react-dom'/,
  'reading overlays use the established portal pattern');
assert.match(drawModal,/return createPortal\(<div className="rune-3d-modal-backdrop"/,
  'the poem modal escapes LOC panel paragraph-color rules');
assert.match(drawModal,/<\/div>,document\.body\);/,
  'the result portal must attach directly to document.body');
assert.match(drawCss,/\.rune-3d-modal \.rune-3d-daily-modal-fields>p\{color:#f7e9d5/,
  'night-background divination poems must be legible in light themes');
assert.match(drawCss,/\.rune-3d-modal \.rune-3d-daily-fields p\{color:#f1e7ec\}/,
  'daily 3D result guidance keeps dedicated readable light text');
assert.match(drawCss,/\.rune-3d-modal\{--rune-gold:#ecd6a6;color-scheme:dark\}/,
  'portal must carry its own rune button border palette and dark color scheme');
console.log('Production 2D/3D atlas: original group art, RuneCardInfo canonical listings, 3D text after authored VFX, no orientation display.');
