// Invoked by npm run verify:ui within the verified Next build.
// These source-text checks do not replace browser or deployment health checks.
import fs from 'node:fs';
const home=fs.readFileSync('app/loc/views/AboutView.jsx','utf8');
const nav=fs.readFileSync('app/GlobalNav.jsx','utf8');
const requiredHome=['LOC月典','語言模型框架（Language Model Framework）'];
const requiredNav=['抽牌','符文圖鑑','遊戲','符文脈絡','符文統計','符文文化','抽籤紀錄','月之符文','脈絡','統計','文化','設定','回月典首頁'];
const missing=[...requiredHome.filter(x=>!home.includes(x)),...requiredNav.filter(x=>!nav.includes(x))];
if(missing.length){console.error('Missing current UI contract: '+missing.join(', '));process.exit(1);}
console.log('Current UI contract verified.');
