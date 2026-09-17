import fs from 'node:fs';

const source=fs.readFileSync('app/nav-route-map.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const scopeCases=[
  ['/context','loc.lo3rwang.cc','loc'],
  ['/runes','loc.lo3rwang.cc','runes'],
  ['/context','lrunes.lo3rwang.cc','runes'],
  ['/runes/context','lo3rwang.cc','lo3rwang'],
  ['/runes/context','manage.lo3rwang.cc','governance']
];
for(const [pathname,host,expected] of scopeCases){
  const actual=nav.detectNavScope(pathname,host);
  if(actual!==expected)throw new Error(`NAV smoke scope mismatch: ${host}${pathname} => ${actual}, expected ${expected}`);
}

const labels={loc:'月之符文',runes:'語彙',lo3rwang:'風格詞',governance:'治理規則'};
for(const [scope,label] of Object.entries(labels)){
  const host=scope==='runes'?'loc.lo3rwang.cc':scope==='lo3rwang'?'lo3rwang.cc':scope==='governance'?'manage.lo3rwang.cc':'loc.lo3rwang.cc';
  const cfg=nav.getNavScopeConfig(scope,host);
  if(cfg.reserved[0]!==label)throw new Error(`NAV smoke reserved entry mismatch: ${scope}`);
}

console.log('NAV scope smoke verified.');
