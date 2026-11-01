import test from 'node:test';
import assert from 'node:assert/strict';
import {anniversaryForDay} from '../app/loc/anniversary.mjs';
import {readFileSync} from 'node:fs';

test('annual date retains month/day and counts from original year',()=>{
  assert.deepEqual(anniversaryForDay('2020-10-16','2026-11-01'),{
    nextDate:'2027-10-16',years:7,monthDay:'10-16',originalDate:'2020-10-16'
  });
  assert.equal(anniversaryForDay('2025-10-16','2026-10-16').years,1);
});
test('Feb 29 stays on a true leap year, never shifts to Feb 28',()=>{
  assert.equal(anniversaryForDay('2024-02-29','2026-11-01').nextDate,'2028-02-29');
  assert.equal(anniversaryForDay('2023-02-29','2026-11-01'),null);
});
test('future dates and invalid dates do not generate imaginary anniversaries',()=>{
  assert.equal(anniversaryForDay('2027-01-01','2026-11-01'),null);
  assert.equal(anniversaryForDay('2026-02-30','2026-11-01'),null);
});
test('article detail links Time, Trace and anniversary without loading all time anchors',()=>{
  const galaxy=readFileSync(new URL('../app/loc/galaxy-query.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/modular/ui.jsx',import.meta.url),'utf8');
  assert.match(galaxy,/columns:'uid,title,address'/);
  assert.match(galaxy,/column:'address',operator:'eq',value:day/);
  assert.match(galaxy,/columns:'uid,type,title,range'/);
  assert.match(galaxy,/storedTimeRange/);
  assert.match(galaxy,/articleSpaceContext\(current,placeId/);
  assert.match(ui,/row\('定錨'/);
  assert.match(ui,/row\('期間'/);
  assert.match(ui,/row\('時代'/);
  assert.match(ui,/row\('週年紀念'/);
  assert.match(ui,/anniversaryForDay\(day\)/);
  assert.match(ui,/white-space:pre-wrap|scope-culture-work-meta-description/);
});
