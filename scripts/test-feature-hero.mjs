import assert from 'node:assert/strict';
import {FEATURE_HERO_PAGE,FEATURE_HERO_ORDER,FEATURE_HERO_IDS,sharedFeatureHeroFor,shouldUseSharedFeatureHero} from '../app/loc/feature-hero.mjs';

assert.equal(FEATURE_HERO_PAGE,'feature_hero');
assert.deepEqual(FEATURE_HERO_IDS,['culture','statics','search','governance']);
assert.equal(new Set(Object.values(FEATURE_HERO_ORDER)).size,4);
assert.deepEqual(Object.values(FEATURE_HERO_ORDER),[1,2,3,4]);

const rows=FEATURE_HERO_IDS.map(featureId=>({
  page_name:FEATURE_HERO_PAGE,
  block_order:FEATURE_HERO_ORDER[featureId],
  block_title:'Title of '+featureId,
  block_subtitle:'<p><strong>Rich '+featureId+'</strong></p>',
  block_text:'<p>Canonical '+featureId+'</p>'
}));
for(const feature of FEATURE_HERO_IDS){
  const heading=sharedFeatureHeroFor(rows,feature);
  assert.equal(heading.title,'Title of '+feature);
  assert.equal(heading.subtitle,'<p><strong>Rich '+feature+'</strong></p>');
  assert.equal(heading.description,'<p>Canonical '+feature+'</p>');
  for(const scope of ['loc','lo3rwang','sample']){
    assert.equal(shouldUseSharedFeatureHero(scope,feature),true);
  }
  assert.equal(shouldUseSharedFeatureHero('lrunes',feature),false,'LunaRunes must stay on existing copy');
  assert.equal(shouldUseSharedFeatureHero('admin',feature),false);
}
assert.equal(shouldUseSharedFeatureHero('loc','home'),false);
assert.equal(sharedFeatureHeroFor(rows,'home'),null);
assert.equal(sharedFeatureHeroFor([], 'culture'),null);
assert.equal(sharedFeatureHeroFor([{...rows[0],page_name:'index'}],'culture'),null,
  'index blocks must never be mistaken for feature headers');
assert.equal(sharedFeatureHeroFor([{...rows[0],block_title:''}],'culture').title,'',
  'empty custom title must still be a distinguishable stored row');
console.log('[feature-hero] one LOC-managed source, four features, scope sharing, rune isolation and fallbacks verified');
