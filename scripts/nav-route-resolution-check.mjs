import fs from 'node:fs/promises';

const source=await fs.readFile('app/nav-route-map.js','utf8');
const runtime=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const names=['context','statics','evolution','governance','search'];
const cases=[
  ['loc','loc.lo3rwang.cc','https://loc.lo3rwang.cc'],
  ['runes','lrunes.lo3rwang.cc','https://lrunes.lo3rwang.cc'],
  ['author','lo3rwang.lo3rwang.cc','https://lo3rwang.lo3rwang.cc'],
  ['governance','admin.lo3rwang.cc','https://admin.lo3rwang.cc']
];

for(const [scope,host,origin] of cases){
  const resolved=runtime.detectNavScope('/',host);
  if(resolved!==scope)throw new Error(`${host}: expected ${scope}, got ${resolved}`);
  const config=runtime.getNavScopeConfig(resolved,host);
  for(const name of names){
    const route=runtime.navRoute(config,name);
    if(route!==`${origin}/${name}`)throw new Error(`${scope}/${name}: expected ${origin}/${name}, got ${route}`);
  }
}

const localRunes=runtime.getNavScopeConfig(runtime.detectNavScope('/runes','loc.lo3rwang.cc'),'loc.lo3rwang.cc');
if(runtime.navRoute(localRunes,'context')!=='https://lrunes.lo3rwang.cc/context')throw new Error('LOC /runes entry must resolve LunaRunes functions to its canonical host');
console.log('Host/scope-aware NAV route resolution verified.');
