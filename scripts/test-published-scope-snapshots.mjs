import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
const read=p=>readFileSync(path.join(root,p),'utf8');
test('normal builds never query the database to publish Bootstrap/Config/Blocks',()=>{
  assert.doesNotMatch(JSON.parse(read('package.json')).scripts.prebuild,/generate-public-blocks/);
  assert.doesNotMatch(read('scripts/build-static-export.mjs'),/\brun\(npm,\['run','sync:public'\]/);
});
test('Scope public configuration shares its JS module with routing',()=>{
  const routes=read('app/modular/scope-route-index.js');
  assert.match(routes,/SCOPE_ROUTE_INDEX/);
  assert.match(routes,/"config":/);
});
test('each published Block is page-split into an actual lazy JS module',()=>{
  const index=read('app/modular/published-blocks/index.js');
  const paths=[...index.matchAll(/import\('\.\/([^']+\.js)'\)/g)].map(x=>x[1]);
  assert.ok(paths.length>=10);
  for(const p of paths)assert.ok(existsSync(path.join(root,'app/modular/published-blocks',p)),p);
  assert.doesNotMatch(read('app/loc/scope-data.js'),/site-bootstrap\.json|\/blocks\/.*\.json/);
});
test('CSS contains eight published Theme palettes',()=>{
  const css=read('app/styles/published-themes.css');
  for(let id=1;id<=8;id++){
    assert.ok(css.includes('[data-theme-id="theme-'+id+'"]'));
    assert.ok(css.includes('.game-shell[data-game-theme="theme-'+id+'"]'));
    assert.equal(css.split('--loc-panel-2:').length-1,8);
  }
});

test('Culture classification is a published JS module, not a mandatory four-query startup',()=>{
  const taxonomy=read('app/modular/published-source-taxonomy.js');
  const culture=read('app/modular/features/Culture.jsx');
  assert.match(taxonomy,/PUBLISHED_SOURCE_TAXONOMY/);
  for(const id of ['loc','lrunes','lo3rwang'])assert.ok(taxonomy.includes('"'+id+'":'));
  assert.match(culture,/if\(published\)return published/);
  assert.match(culture,/openCultureRoots\.length>0/);
  assert.match(culture,/culture-children/);
  assert.match(culture,/culture-roots/);
  assert.ok(culture.includes("selectedRiverGroup+'|source|'"));
});
