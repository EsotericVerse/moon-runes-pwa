import {existsSync,readFileSync} from 'node:fs';
const required=['app/loc/neon-client.js','app/loc/data.js','app/loc/neon-scope-projections.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/StatisticsV2.jsx','app/modular-v2/features/CultureV2.jsx'];
const failures=[];
for(const path of required){if(!existsSync(path))failures.push(`missing runtime module: ${path}`);}
const data=readFileSync('app/loc/data.js','utf8');
const projections=readFileSync('app/loc/neon-scope-projections.js','utf8');
if(!data.includes("from('runtime_json_documents')"))failures.push('runtime documents must use Neon SELECT');
if(data.includes('fetchStaticJson'))failures.push('runtime data loader still has local static fallback');
if(!projections.includes('neonClient.from'))failures.push('Scope projections must use Neon SELECT');
if(failures.length){console.error('[semantics] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('Current semantics verified against Neon runtime projections.');
