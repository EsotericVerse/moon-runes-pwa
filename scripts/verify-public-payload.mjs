import {existsSync} from 'node:fs';

const base=existsSync('out')?'out':'.';
const required=[
  'pics/LOC-FrameworkPic.png',
  'pics/LunaRunes.jpg',
  'pics/LOC-structure.png',
  'assets/lunarunes/reference/loc_runes_66_overview.jpg',
  'assets/lunarunes/cards/66_命.png',
  'assets/site/icons/icon-192x192.png',
  'LunarRunesCardCut.pdf'
];
const missing=required.filter(path=>!existsSync(`${base}/${path}`));
if(missing.length){
  console.error('[public-payload] missing required public payload:\n'+missing.map(path=>'- '+path).join('\n'));
  process.exit(1);
}
console.log('[public-payload] required public payload verified');
