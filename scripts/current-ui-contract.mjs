import fs from 'node:fs';
const home=fs.readFileSync('app/loc/views/AboutView.jsx','utf8');
const nav=fs.readFileSync('app/GlobalNav.jsx','utf8');
const requiredHome=['LOC月典','語言模型框架（Language Model Framework）'];
const requiredNav=['語彙','脈絡','統計','文化','治理','搜尋','作者介紹','回月典首頁'];
const missing=[...requiredHome.filter(x=>!home.includes(x)),...requiredNav.filter(x=>!nav.includes(x))];
if(missing.length){console.error('Missing current UI contract: '+missing.join(', '));process.exit(1);}
console.log('Current UI contract verified.');
