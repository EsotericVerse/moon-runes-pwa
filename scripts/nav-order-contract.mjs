import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const shared=['脈絡','統計','文化','治理','搜尋'];
const expected={
 loc:['月之符文',...shared,'lo3rwang','回月典首頁'],
 runes:['語彙',...shared,'lo3rwang','回月之符文首頁','回月典首頁'],
 lo3rwang:['風格詞',...shared,'管理者頁面','回 lo3rwang','回月典首頁'],
 admin:['Admin','回 Admin','回月典首頁']
};
for(const [scope,cfg] of Object.entries(map.scopes)){
 const common=scope==='admin'?[]:shared;
 const actual=[cfg.reserved.label,...common,...(cfg.role||[]).map(x=>x.label),...(cfg.homes||[]).map(x=>x.label)];
 if(JSON.stringify(actual)!==JSON.stringify(expected[scope]))throw new Error(`${scope} NAV order drifted`);
}
console.log('NAV order by Scope verified.');
