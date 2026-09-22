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

const names=['靈','意','識','魂','向','斷','封','啟','誤','悟','鍊','分','生','老','病','死','心','愛','語','韻','樹','花','葉','草','根','種','實','枝','金','玉','晶','地','石','鑽','礦','塵','光','暗','水','火','風','土','雷','氣','日','月','星','辰','明','時','空','因','福','禍','無','夢','幻','緣','虛','果'];
names.forEach((name,index)=>requireFile(`assets/lunarunes/cards/${String(index+1).padStart(2,'0')}_${name}.png`));
requireFile('assets/lunarunes/cards/65_玄.png');
requireFile('assets/lunarunes/cards/66_命.png');
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
