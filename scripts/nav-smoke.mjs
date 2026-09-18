import fs from 'node:fs';
const s=fs.readFileSync('app/nav-route-map.js','utf8');
const assertions=[
  ["return 'runes'","rune scope"],["return 'lo3rwang'","lo3rwang scope"],["return 'governance'","governance scope"],
  ["host==='lrunes.lo3rwang.cc'","LunaRunes host"],["host==='lo3rwang.lo3rwang.cc'","lo3rwang host"],["host==='admin.lo3rwang.cc'","management host"],
  ["reserved:['月之符文','/runes']","LOC reserved entry"],["reserved:['語彙'","LunaRunes reserved entry"],["reserved:['風格詞'","lo3rwang reserved entry"],["reserved:['治理規則'","governance reserved entry"]
];
const missing=assertions.filter(([token])=>!s.includes(token)).map(([,label])=>label);
if(missing.length){console.error('NAV smoke missing: '+missing.join(', '));process.exit(1)}
console.log('NAV scope smoke verified.');

if(!s.includes("pathname==='/lo3rwang'"))throw new Error('Missing /lo3rwang personal Scope detection');
