import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const shared=['脈絡','統計','文化','治理','搜尋框'];
const expected={
 loc:['月之符文',...shared,'作者介紹','回月典首頁'],
 runes:['語彙',...shared,'管理者介紹','回月之符文首頁','回月典首頁'],
 author:['簡介',...shared,'管理者介紹','回作者簡介','回月典首頁'],
 governance:['治理規則',...shared,'管理者介紹','回治理頁面','回月典首頁']
};
for(const [scope,cfg] of Object.entries(map.scopes)){
 const actual=[cfg.reserved.label,...shared,...(cfg.role||[]).map(x=>x.label),...(cfg.homes||[]).map(x=>x.label)];
 if(JSON.stringify(actual)!==JSON.stringify(expected[scope]))throw new Error(`${scope} NAV order drifted`);
}
console.log('NAV order by Scope verified.');
