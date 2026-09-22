import {existsSync,readFileSync} from 'node:fs';
const required=['app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/StatisticsV2.jsx','app/modular-v2/features/CultureV2.jsx','app/loc/neon-scope-projections.js','app/modular-v2/modules/scope-tree/ScopeTreeEditor.jsx'];
const failures=[];
for(const path of required)if(!existsSync(path))failures.push(`missing modular module: ${path}`);
const context=readFileSync('app/modular-v2/features/ContextV2.jsx','utf8');
const statistics=readFileSync('app/modular-v2/features/StatisticsV2.jsx','utf8');
const projections=readFileSync('app/loc/neon-scope-projections.js','utf8');
if(!context.includes("selectScopeProjectionRows(scopeId,'context')"))failures.push('ContextV2 must read shared Scope projection');
if(!statistics.includes('selectScopeRankingPage'))failures.push('StatisticsV2 must use paged Neon ranking selector');
if(!projections.includes('range('))failures.push('Scope projections must use range pagination');
if(failures.length){console.error('[modularity] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('Modular V2 Scope runtime verified.');
