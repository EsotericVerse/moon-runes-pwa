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

const publicPics=[
  '01.soul.jpg',
  '02_connection.jpg',
  '03_life.jpg',
  '04_nature.jpg',
  '05_mineral.jpg',
  '06_element.jpg',
  '07_order.jpg',
  '08_disorder.jpg',
  '09_specia.jpg',
  'g1c-soul.link.jpg',
  'g2c-mineral.life.jpg',
  'g3c-nature.element.jpg',
  'g4c-order.disorder.jpg',
  'lo3rwang-3.png',
  'LOC-auth.png',
];

const picsTarget=path.join(output,'pics');
fs.rmSync(picsTarget,{recursive:true,force:true});
fs.mkdirSync(picsTarget,{recursive:true});
for(const name of publicPics){
  const source=path.join(root,'pics',name);
  if(!fs.existsSync(source))throw new Error(`Static picture source missing: pics/${name}`);
  fs.copyFileSync(source,path.join(picsTarget,name));
}

const rootDownloads=['LunarRunesCardCut.pdf'];
for(const name of rootDownloads){
  const source=path.join(root,name);
  if(!fs.existsSync(source))throw new Error(`Static asset source missing: ${name}`);
  fs.copyFileSync(source,path.join(output,name));
}

console.log(`[static-assets] copied assets/, ${publicPics.length} Current pics and ${rootDownloads.length} governed root downloads into out/`);
