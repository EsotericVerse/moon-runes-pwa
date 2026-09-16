import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('scripts/nav-implementation-status.json','utf8'));
if(s.status!=='ready'||!s.centralResolver||!s.scopeRouteMap||!s.legacyRendererAligned||!s.ciGuard||s.underlyingFeaturePagesChanged!==false)throw new Error('NAV implementation status inconsistent');
console.log('NAV implementation status verified.');
