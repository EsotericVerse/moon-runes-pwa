import {existsSync,readFileSync} from 'node:fs';
const required=['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-client.js','app/loc/neon-scope-projections.js','app/modular-v2/modules/scope-tree/index.js','app/modular-v2/modules/scope-tree/scope-tree-contract.js','app/runes/RuneDirectoryPages.jsx','js/runes-core.js','js/writing.js'];
const failures=[];
for(const path of required)if(!existsSync(path))failures.push(`missing module: ${path}`);
for(const path of ['app/loc/data.js','app/loc/neon-client.js','app/loc/neon-scope-projections.js','app/runes/RuneDirectoryPages.jsx','js/runes-core.js','js/writing.js']){const text=readFileSync(path,'utf8');if(/(?:from|import).*data\/json|readFileSync\([^)]*data\/json|fetch\([^)]*data\/json/.test(text))failures.push(`runtime JSON reference: ${path}`);}
if(failures.length){console.error('[modules] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('Neon runtime module contracts verified.');
