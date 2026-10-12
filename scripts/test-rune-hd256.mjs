import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFECT_ASSET_BLOBS} from './rune-effekseer-asset-manifest.mjs';
import {HD256_SPRITE_EDGE,isHd256ParticleTexture,redirectHd256ParticleTexture} from '../app/lrunes/effekseer/hd256-particle-paths.mjs';

assert.equal(HD256_SPRITE_EDGE,256);
for(const [input,expected] of [
 ['MAGICALxSPIRAL/Texture/smoke_01.png','MAGICALxSPIRAL/Texture/_hd256/smoke_01.png'],
 ['/vendor/effekseer/Collections/tktk/Texture/Particle02.png','/vendor/effekseer/Collections/tktk/Texture/_hd256/Particle02.png'],
 ['godot4/Textures/tx_glow01_128.png','godot4/Textures/_hd256/tx_glow01_128.png'],
 ['godot4\\Textures\\tx_glow01_128.png','godot4\\Textures\\_hd256\\tx_glow01_128.png'],
 ['Texture/star.png?rev=1','Texture/_hd256/star.png?rev=1'],
 ['MAGICALxSPIRAL/Texture/shield_color.png','MAGICALxSPIRAL/Texture/_hd256/shield_color.png']
])assert.equal(redirectHd256ParticleTexture(input),expected,'bad 256 sprite route: '+input);

for(const name of [
 'godot4/Textures/tx_fire_flipbook01_1024.png',
 'godot4/Textures/tx_noise01_256.png',
 'godot4/Textures/tx_gradient01_256.png',
 'MAGICALxSPIRAL/Texture/Water_normal.png',
 'godot4/Textures/tx_white01_8.png',
 'godot4-material1/Textures/Distortion01.png',
 'MAGICALxSPIRAL/Texture/_fog-cloud-2048.png',
 'MAGICALxSPIRAL/MxS_foot_smoke2.efkefc'
])assert.equal(redirectHd256ParticleTexture(name),name,'protected texture modified: '+name);

const original=EFFECT_ASSET_BLOBS.filter(row=>row.target.endsWith('.png'));
const selected=original.filter(row=>redirectHd256ParticleTexture(row.target)!==row.target);
assert.equal(original.length,148,'pinned texture library count changed; re-audit the upgrade');
assert.ok(selected.length>=100&&selected.length<=140,'unexpected HD256 trial material classification');
assert.equal(new Set(selected.map(row=>redirectHd256ParticleTexture(row.target))).size,selected.length);
assert.equal(isHd256ParticleTexture('star.png'),true);
assert.equal(isHd256ParticleTexture('tx_fire_flipbook01_1024.png'),false);

const stage=readFileSync('app/lrunes/effekseer/EffekseerStage.jsx','utf8');
const draw=readFileSync('app/lrunes/Rune3DPreview.jsx','utf8');
const atlas=readFileSync('app/lrunes/Rune3DLibrary.jsx','utf8');
const prepare=readFileSync('scripts/prepare-rune-effekseer-hd256.mjs','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.match(stage,/textureQuality==='hd256'\?redirectHd256ParticleTexture:undefined/,
 'native loadEffect must receive HD256 resource callback');
assert.match(stage,/},textureRedirect\);/,'base effect sprite pack must be used');
assert.match(stage,/},hd256Redirect\);/,'group/impact/overlay must also be redirectable');
assert.match(draw,/useState\('hd256'\)/,'public draw stage must start with 256 pixels');
assert.match(atlas,/useState\('hd256'\)/,'public atlas must start with 256 pixels');
assert.match(draw,/RuneMistBackdrop phase=\{phase\} quality=\{sceneQuality\} textureQuality=\{textureQuality\}/,
 'opt-in smoke must continue to be present');
assert.match(stage,/textureQuality='original'/,'renderer must retain emergency resource rollback');
assert.match(prepare,/HD256_SPRITE_EDGE/);
assert.match(prepare,/meta\.hasAlpha/,'transparency must be preserved');
assert.match(prepare,/scale=Math\.max\(1,HD256_SPRITE_EDGE\/Math\.max\(meta\.width,meta\.height\)\)/,
 'upscale below 256 but do not downsample already detailed images');
assert.match(pkg.scripts.prebuild,/prepare-rune-effekseer-hd256\.mjs/,'production build must create 256 assets');
assert.match(pkg.scripts.predev,/prepare-rune-effekseer-hd256\.mjs/,'local build must create 256 assets');
console.log('[HD256] '+selected.length+' pinned authored PNGs route to 256xmax-edge sprites, originals retained.');
