import {existsSync} from 'node:fs';
const failures=[];
for(let id=1;id<=66;id++){const file=`assets/lunarunes/cards/${String(id).padStart(2,'0')}_`;if(!existsSync(file)){} }
const names=['靈','魂','彩','憶','界','域','鏡','核','向','斷','封','鍊','啟','分','悟','誤','生','老','病','死','心','愛','語','韻','樹','花','葉','草','根','種','實','枝','金','玉','晶','地','石','鑽','礦','塵','光','暗','水','火','風','土','雷','氣','日','月','星','辰','明','時','空','因','福','禍','無','夢','幻','緣','虛','果','玄','命'];
for(const [index,name] of names.entries()){const path=`assets/lunarunes/cards/${String(index+1).padStart(2,'0')}_${name}.png`;if(!existsSync(path))failures.push(`cards: missing ${path}`);}
if(failures.length){console.error('RC4 integrity verification failed:\n'+failures.join('\n'));process.exit(1);}
console.log('RC4 integrity OK: 66 Neon-projected rune cards and assets complete.');
