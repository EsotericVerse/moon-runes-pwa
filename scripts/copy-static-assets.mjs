import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'out');

for(const name of ['pics','assets']){
  const source=path.join(root,name);
  const target=path.join(output,name);
  if(!fs.existsSync(source))throw new Error(`Static asset source missing: ${name}`);
  fs.rmSync(target,{recursive:true,force:true});
  fs.cpSync(source,target,{recursive:true});
}

const cardPdf=path.join(root,'LunarRunesCardCut.pdf');
if(!fs.existsSync(cardPdf))throw new Error('Static asset source missing: LunarRunesCardCut.pdf');
fs.copyFileSync(cardPdf,path.join(output,'LunarRunesCardCut.pdf'));

console.log('[static-assets] copied pics/, assets/ and LunarRunesCardCut.pdf into out/ for GitHub Pages');
