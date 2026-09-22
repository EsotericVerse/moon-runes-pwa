import {existsSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
const output=resolve(process.cwd(),'out');
if(existsSync(output))rmSync(output,{recursive:true,force:true});
console.log('[next-export] cleared generated out/ before export');
