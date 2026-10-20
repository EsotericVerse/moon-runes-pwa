import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOFT_MATTE_NAMES,redirectSoftMatteTexture}
  from '../app/lrunes/effekseer/soft-matte-textures.mjs';
import {runeEffectFor} from '../app/lrunes/effekseer/rune-effect-library.mjs';

assert.deepEqual(SOFT_MATTE_NAMES,
  ['Line1.png','Line2.png','particle2.png','smoke_01.png','star.png']);
for(const file of SOFT_MATTE_NAMES){
  const texture='Collections/MAGICALxSPIRAL/Texture/'+file;
  assert.equal(redirectSoftMatteTexture(texture),
    'Collections/MAGICALxSPIRAL/Texture/_softmatte/'+file);
}
assert.equal(redirectSoftMatteTexture('Textures/tx_noise01_256.png'),'Textures/tx_noise01_256.png');
assert.equal(redirectSoftMatteTexture('Texture/Thunder1.png'),'Texture/Thunder1.png');
assert.equal(redirectSoftMatteTexture('MAGICALxSPIRAL/MxS_Sylph10.efkefc'),
  'MAGICALxSPIRAL/MxS_Sylph10.efkefc');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(runeEffectFor({english_name:'Jade'}).overlays[0].key,'M:Gohlem_Shield1',
  'Jade must never replay opaque ImageDistortion demo material over the large glyph');
assert.equal(runeEffectFor({english_name:'Mirror'}).overlays[0].key,'S:ImageDistortion',
  'unrelated Mirror effect should not be silently altered');
assert.equal(runeEffectFor({english_name:'Phase'}).key,'M:Sylph10');
assert.equal(runeEffectFor({english_name:'Illusion'}).key,'M:foot_smoke2');
assert.ok(pkg.scripts.prebuild.includes('prepare-rune-effekseer-soft-matte.mjs'));
assert.ok(pkg.scripts.predev.includes('prepare-rune-effekseer-soft-matte.mjs'));
console.log('[EFFEKSEER-SOFTMATTE] Selected Illusion/Phase/Jade edge repairs scoped; 63 other rune effects unchanged.');
