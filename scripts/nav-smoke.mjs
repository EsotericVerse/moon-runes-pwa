import fs from 'node:fs';

const source=fs.readFileSync('app/nav-route-map.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const scopeCases=[
  ['/context','loc.lo3rwang.cc','loc'],
  ['/runes','loc.lo3rwang.cc','loc'],
  ['/context','lrunes.lo3rwang.cc','runes'],
  ['/runes/context','lrunes.lo3rwang.cc','runes'],
  ['/runes/context','lo3rwang.lo3rwang.cc','lo3rwang'],
  ['/runes/context','admin.lo3rwang.cc','admin'],
  ['/admin/routes','loc.lo3rwang.cc','loc'],
  ['/runes/context','','runes'],
  ['/admin/routes','','admin']
];
for(const [pathname,host,expected] of scopeCases){
  const actual=nav.detectNavScope(pathname,host);
  if(actual!==expected)throw new Error(`NAV smoke scope mismatch: ${host}${pathname} => ${actual}, expected ${expected}`);
}

const labels={loc:'月之符文',runes:'語彙',lo3rwang:'風格詞',admin:'Admin'};
for(const [scope,label] of Object.entries(labels)){
  const host=scope==='runes'?'lrunes.lo3rwang.cc':scope==='lo3rwang'?'lo3rwang.lo3rwang.cc':scope==='admin'?'admin.lo3rwang.cc':'loc.lo3rwang.cc';
  const cfg=nav.getNavScopeConfig(scope,host);
  if(cfg.reserved[0]!==label)throw new Error(`NAV smoke reserved entry mismatch: ${scope}`);
}

const runes=nav.getNavScopeConfig('runes','lrunes.lo3rwang.cc');
if(runes.reserved[1]!=='https://lrunes.lo3rwang.cc/list')throw new Error('LunaRunes vocabulary must target the rune atlas domain /list.');
if(!runes.role.some(([label,href])=>label==='管理者首頁'&&href==='https://lo3rwang.lo3rwang.cc'))throw new Error('LunaRunes manager home mismatch.');

console.log('NAV domain-first scope smoke verified.');
