import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'out');

const assetsSource=path.join(root,'assets');
const assetsTarget=path.join(output,'assets');
if(!fs.existsSync(assetsSource))throw new Error('Static asset source missing: assets');
fs.rmSync(assetsTarget,{recursive:true,force:true});
fs.cpSync(assetsSource,assetsTarget,{recursive:true});

// pics/ is copied wholesale, the same as assets/ above: any image added here
// (including new subfolders) ships to the static export automatically, with
// no per-file whitelist to maintain by hand.
const picsSource=path.join(root,'pics');
const picsTarget=path.join(output,'pics');
if(!fs.existsSync(picsSource))throw new Error('Static asset source missing: pics');
fs.rmSync(picsTarget,{recursive:true,force:true});
fs.cpSync(picsSource,picsTarget,{recursive:true});

const rootDownloads=['LunarRunesCardCut.pdf'];
for(const name of rootDownloads){
  const source=path.join(root,name);
  if(!fs.existsSync(source))throw new Error(`Static asset source missing: ${name}`);
  fs.copyFileSync(source,path.join(output,name));
}

console.log(`[static-assets] copied assets/, pics/ (whole directory) and ${rootDownloads.length} governed root downloads into out/`);
