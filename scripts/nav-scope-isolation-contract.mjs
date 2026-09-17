import fs from 'node:fs';

const source=fs.readFileSync('app/nav-route-map.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const loc=nav.getNavScopeConfig('loc','loc.lo3rwang.cc');
if(nav.navRoute(loc,'context')!=='/context')throw new Error('LOC Scope route base drifted');

const runesOnLoc=nav.getNavScopeConfig('runes','loc.lo3rwang.cc');
if(nav.navRoute(runesOnLoc,'context')!=='/runes/context')throw new Error('Rune shared routes may escape /runes Scope');

const runesStandalone=nav.getNavScopeConfig('runes','lrunes.lo3rwang.cc');
if(nav.navRoute(runesStandalone,'context')!=='/context')throw new Error('Standalone LunaRunes route drifted');

if(nav.detectNavScope('/runes/context','lo3rwang.cc')!=='lo3rwang')throw new Error('Canonical personal host must override conflicting path shape');
if(nav.detectNavScope('/runes/context','manage.lo3rwang.cc')!=='governance')throw new Error('Canonical management host must override conflicting path shape');

console.log('NAV Scope isolation verified.');
