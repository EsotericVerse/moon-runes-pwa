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
const prepare=readFileSync('scripts/prepare-rune-effekseer-hd256.mjs','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
console.log('[HD256] '+selected.length+' pinned authored PNGs route to 256xmax-edge sprites, originals retained.');
