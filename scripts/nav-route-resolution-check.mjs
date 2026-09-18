import fs from 'node:fs/promises';

const source=await fs.readFile('app/site-registry.js','utf8');
const runtime=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const names=['context','statics','culture','governance','search'];
const cases=[
  ['loc','loc.lo3rwang.cc','https://loc.lo3rwang.cc'],
  ['runes','lrunes.lo3rwang.cc','https://lrunes.lo3rwang.cc'],
  ['lo3rwang','lo3rwang.lo3rwang.cc','https://lo3rwang.lo3rwang.cc'],
  ['governance','admin.lo3rwang.cc','https://admin.lo3rwang.cc']
];

for(const [scope,host,origin] of cases){
  const resolved=runtime.detectSiteScope('/',host);
  if(resolved!==scope)throw new Error(`${host}: expected ${scope}, got ${resolved}`);
  for(const name of names){
    const route=runtime.featureRoute(scope,name);
    if(route!==`${origin}/${name}`)throw new Error(`${scope}/${name}: expected ${origin}/${name}, got ${route}`);
  }
}
if(runtime.detectSiteScope('/runes','loc.lo3rwang.cc')!=='runes')throw new Error('LOC /runes alias must resolve to LunaRunes Scope');
console.log('Current site-registry route resolution verified.');
