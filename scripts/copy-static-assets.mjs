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
  'LOC-FrameworkPic.png',
  'LOC-PicAll.png',
  'LOC-structure.png',
  'LunaRunes.jpg',
  'aboutme.png'
];

const picsTarget=path.join(output,'pics');
fs.rmSync(picsTarget,{recursive:true,force:true});
fs.mkdirSync(picsTarget,{recursive:true});
for(const name of publicPics){
  const source=path.join(root,'pics',name);
  if(!fs.existsSync(source))throw new Error(`Static picture source missing: pics/${name}`);
  fs.copyFileSync(source,path.join(picsTarget,name));
}

const cardPdf=path.join(root,'LunarRunesCardCut.pdf');
if(!fs.existsSync(cardPdf))throw new Error('Static asset source missing: LunarRunesCardCut.pdf');
fs.copyFileSync(cardPdf,path.join(output,'LunarRunesCardCut.pdf'));

console.log(`[static-assets] copied assets/, ${publicPics.length} Current pics and LunarRunesCardCut.pdf into out/`);
