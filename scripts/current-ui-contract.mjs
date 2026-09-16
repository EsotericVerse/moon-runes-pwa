// Invoked by npm run verify:ui within the verified Next build.
// These source-text checks do not replace browser or deployment health checks.
import fs from 'node:fs';
const home=fs.readFileSync('app/loc/views/AboutView.jsx','utf8');
const nav=fs.readFileSync('app/GlobalNav.jsx','utf8');
const canon=fs.readFileSync('docs/LOC_Canon_1.1.md','utf8');
const requiredHome=['LOC月典','語言模型框架（Language Model Framework）','/pics/LunaRunes.jpg','月典模型架構','ModelArchitectureExplorer',"name:'LunaRunes'","name:'Context'","name:'Music'","name:'Literary'","name:'MultiMedia'","name:'Algorithm'","name:'Module'","name:'Culture'",'Base66','卡片月相：無 / 真實月相：空亡'];
const forbiddenHome=["name:'Methodology'","name:'Evolution'",'Governance｜治理架構層','Governance Architecture'];
const requiredNav=['月之符文','脈絡','統計','文化','設定','抽牌','符文圖鑑','遊戲','符文脈絡','符文統計','符文文化','抽籤紀錄','搜尋','回月典首頁'];
const requiredCanon=['「卡片月相」與「真實月相」是兩個不同欄位','真實月相屬當下時間情境'];
const missing=[...requiredHome.filter(x=>!home.includes(x)),...requiredNav.filter(x=>!nav.includes(x)),...requiredCanon.filter(x=>!canon.includes(x))];
const forbidden=forbiddenHome.filter(x=>home.includes(x));
if(missing.length||forbidden.length){
  if(missing.length) console.error('Missing current UI contract: '+missing.join(', '));
  if(forbidden.length) console.error('Forbidden stale UI contract: '+forbidden.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified.');
