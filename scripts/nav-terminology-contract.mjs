import fs from 'node:fs';
const files=fs.readFileSync('scripts/nav-current-files.txt','utf8').trim().split(/\r?\n/);
const obsolete=['NAV'+'1','NAV'+'2','NAV'+'3','nav'+'1.css'];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const token of obsolete)if(text.includes(token))throw new Error(`${file}: obsolete NAV terminology ${token}`);}
console.log('Current NAV terminology verified.');
