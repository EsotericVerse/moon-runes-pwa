import assert from 'node:assert/strict';
import fs from 'node:fs';
const classify=fs.readFileSync('app/loc/views/ClassifyView.jsx','utf8');
const governance=fs.readFileSync('app/loc/views/GovernanceView.jsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
for(const token of ['classifyRuneSemantics','LunaRunes Semantic Judgment','AND／PLUS／OVERRIDE／DEFER','Author Scope'])assert.ok(classify.includes(token),`ClassifyView missing ${token}`);
for(const token of ['14 → 24 → 32 → 42 → 66','日月表示歲月／一段時期 → 辰','Statistics 只統計經演算法確認的 semantic hits'])assert.ok(governance.includes(token),`GovernanceView missing ${token}`);
assert.ok(pkg.scripts['verify:rune-semantic'].includes('verify-rune-era-statistics.mjs'));
console.log('Rune semantic UI integration verified.');
