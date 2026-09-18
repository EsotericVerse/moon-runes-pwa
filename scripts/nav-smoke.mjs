import fs from 'node:fs';

const source=fs.readFileSync('app/nav-route-map.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const scopeCases=[
  ['/context','loc.lo3rwang.cc','loc'],
  ['/runes','loc.lo3rwang.cc','runes'],
  ['/context','lrunes.lo3rwang.cc','runes'],
  ['/context','lo3rwang.lo3rwang.cc','lo3rwang'],
  ['/runes/context','lo3rwang.cc','runes'],
  ['/runes/context','admin.lo3rwang.cc','admin'],
  ['/admin/routes','loc.lo3rwang.cc','admin']
];
for(const [pathname,host,expected] of scopeCases){
  const actual=nav.detectNavScope(pathname,host);
  if(actual!==expected)throw new Error(`NAV smoke scope mismatch: ${host}${pathname} => ${actual}, expected ${expected}`);
}

const labels={loc:'月之符文',runes:'語彙',lo3rwang:'風格詞',admin:'Admin'};
for(const [scope,label] of Object.entries(labels)){
  const cfg=nav.getNavScopeConfig(scope);
  if(cfg.reserved[0]!==label)throw new Error(`NAV smoke reserved entry mismatch: ${scope}`);
}

if(nav.getNavScopeConfig('runes').reserved[1]!=='https://lrunes.lo3rwang.cc/')throw new Error('LunaRunes canonical domain lost NAV priority');
if(nav.getNavScopeConfig('lo3rwang').reserved[1]!=='https://lo3rwang.lo3rwang.cc/')throw new Error('lo3rwang canonical domain drifted');

console.log('NAV domain-first scope smoke verified.');
