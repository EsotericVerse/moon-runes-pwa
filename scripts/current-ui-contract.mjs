import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const sources={home:read('app/loc/views/AboutView.jsx'),nav:read('app/GlobalNav.jsx')+read('app/modular-v2/ScopeNavV2.jsx'),registry:read('app/modular-v2/scope-registry.v2.js'),locApp:read('app/loc/LocApp.jsx')};
const required=['LOC月典','FEATURES_V2','useScopeRuntimeV2','ContextV2','StatisticsV2','CultureV2','GovernanceV2','SearchV2'];
const missing=required.filter(token=>!Object.values(sources).join('\n').includes(token));
if(missing.length){console.error('Missing Current UI contract: '+missing.join(', '));process.exit(1);}
console.log('Current UI contract verified against modular V2 Scope composition.');
