import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('scripts/nav-final-state.json','utf8'));
if(!s.navOnly||!s.readyForPR||!s.requiresFeatureRouteFollowup)throw new Error('NAV final state inconsistent');
console.log('NAV final state verified.');
