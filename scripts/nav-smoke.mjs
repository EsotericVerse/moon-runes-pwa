import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
const registry=fs.readFileSync('app/scope-registry.js','utf8');
const assertions=[
  [registry,"id:'runes'",'rune scope'],[registry,"id:'author'",'author scope'],[registry,"id:'management'",'management scope'],
  [registry,"host:'lrunes.lo3rwang.cc'",'LunaRunes host'],[registry,"host:'whoami.lo3rwang.cc'",'author host'],[registry,"host:'manage.lo3rwang.cc'",'management host'],
  [registry,"reserved:['月之符文'",'LOC reserved entry'],[registry,"reserved:['語彙'",'LunaRunes reserved entry'],[registry,"reserved:['風格詞'",'author reserved entry'],[registry,"reserved:['治理規則'",'management reserved entry'],
  [runtime,'detectScope','scope resolver'],[runtime,'getScope','scope config'],[runtime,'scopeRoute','scope route']
];
const missing=assertions.filter(([source,token])=>!source.includes(token)).map(([, ,label])=>label);
if(missing.length){console.error('NAV smoke missing: '+missing.join(', '));process.exit(1)}
console.log('NAV Scope Registry smoke verified.');
