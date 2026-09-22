import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const failures=[];
function requireFile(path){
  if(!existsSync(resolve(root,path)))failures.push(`missing required file: ${path}`);
}
function requireText(path,needle){
  if(!existsSync(resolve(root,path))){failures.push(`missing required file: ${path}`);return;}
  if(!readFileSync(resolve(root,path),'utf8').includes(needle))failures.push(`${path}: missing ${needle}`);
}

for(const name of ['靈','魂','彩','憶','界','域','鏡','核','向','斷','封','鍊','啟','分','悟','誤','生','老','病','死','心','愛','語','韻','樹','花','葉','草','根','種','實','枝','金','玉','晶','地','石','鑽','礦','塵','光','暗','水','火','風','土','雷','氣','日','月','星','辰','明','時','空','因','福','禍','無','夢','幻','緣','虛','果','玄','命']){
  const id=String(name==='玄'?65:name==='命'?66:name==='德'?0:0).padStart(2,'0');
  if(name!=='德')requireFile(`assets/lunarunes/cards/${id}_${name}.png`);
}
requireText('app/api/loc/data/route.js','silver.lrunes_runes');
requireText('app/api/loc/data/route.js','silver.lrunes_harmony');
requireText('app/api/loc/data/route.js','silver.lrunes_evolution_history');
requireText('app/api/culture/route.js','silver.lrunes_evolution_history');
requireText('app/loc/neon-repository.js','silver.lrunes_runes');

if(failures.length){
  console.error('[canonical-integrity] violations:\\n'+failures.map(item=>'- '+item).join('\\n'));
  process.exit(1);
}
console.log('[canonical-integrity] Neon Base66 route and card assets are wired');
