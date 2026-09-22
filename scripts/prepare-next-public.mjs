import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildScopeRoutePolicyV2} from './scope-route-policy.mjs';

const ROOT=process.cwd();
const PUBLIC=path.join(ROOT,'public');
const PUBLIC_PICS=['01.soul.jpg','02_connection.jpg','03_life.jpg','04_nature.jpg','05_mineral.jpg','06_element.jpg','07_order.jpg','08_disorder.jpg','09_specia.jpg','LOC-FrameworkPic.png','LOC-PicAll.png','LOC-structure.png','LunaRunes.jpg','aboutme.png'];
async function copyPath(sourceRel,targetRel=sourceRel){const source=path.join(ROOT,sourceRel);const target=path.join(PUBLIC,targetRel);await mkdir(path.dirname(target),{recursive:true});await cp(source,target,{recursive:true});}
await rm(PUBLIC,{recursive:true,force:true});
await mkdir(PUBLIC,{recursive:true});
await writeFile(path.join(PUBLIC,'scope-route-policy.json'),`${JSON.stringify(buildScopeRoutePolicyV2(),null,2)}\n`,'utf8');
for(const rel of ['assets/lunarunes/cards','assets/lunarunes/reference','assets/site/diagrams','assets/site/icons','data/html/runes-beginner.html','docs/LOC_Canon_1.0.docx','LunarRunesCardCut.pdf','apple-touch-icon.png','favicon.ico','manifest.json','CNAME'])await copyPath(rel);
for(const name of PUBLIC_PICS)await copyPath(`pics/${name}`);
console.log('Prepared Neon-only Next public payload; runtime JSON is not copied to public/.');
