import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const required=['out/index.html','out/lrunes/index.html','out/context/index.html','out/statics/index.html'];
const missing=required.filter(path=>!existsSync(resolve(process.cwd(),path)));
if(missing.length){console.error('[next-export] missing required files:\n'+missing.join('\n'));process.exit(1);}
const html=readFileSync(resolve(process.cwd(),'out/index.html'),'utf8');
if(!html.includes('_next')){console.error('[next-export] root output is not a valid Next export');process.exit(1);}
console.log(`[next-export] verified ${required.length} required LOC export files`);
