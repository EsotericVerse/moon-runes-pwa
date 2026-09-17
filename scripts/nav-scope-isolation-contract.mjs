import fs from 'node:fs';

const source=fs.readFileSync('app/nav-route-map.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const loc=nav.getNavScopeConfig('loc');
if(nav.navRoute(loc,'context')!=='https://loc.lo3rwang.cc/context')throw new Error('LOC canonical domain route drifted');

const runesOnLoc=nav.getNavScopeConfig('runes');
if(nav.navRoute(runesOnLoc,'context')!=='https://lrunes.lo3rwang.cc/context')throw new Error('LunaRunes canonical domain lost priority over /runes fallback');

const runesStandalone=nav.getNavScopeConfig('runes');
if(nav.navRoute(runesStandalone,'context')!=='https://lrunes.lo3rwang.cc/context')throw new Error('Standalone LunaRunes canonical route drifted');

if(nav.detectNavScope('/runes/context','lo3rwang.lo3rwang.cc')!=='lo3rwang')throw new Error('Canonical personal host must override conflicting path shape');
if(nav.detectNavScope('/runes/context','lo3rwang.cc')!=='runes')throw new Error('Base Domain must not impersonate Author Scope');
if(nav.detectNavScope('/runes/context','admin.lo3rwang.cc')!=='admin')throw new Error('Canonical Admin host must override conflicting path shape');

console.log('NAV domain-first Scope isolation verified.');
