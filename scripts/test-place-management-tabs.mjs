import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Place management exposes four explicit task panels, only one at a time',()=>{
  const source=read('app/loc/PlaceManagement.jsx');
  for(const label of ['空間定錨點','名稱整理','Timeline 地點整理','快速補打卡'])
    assert.ok(source.includes(label),label);
  assert.match(source,/active==='anchor'\?<TraceManagement scopeId=\{scopeId\} mode="anchor"/);
  assert.match(source,/active==='names'\?<TraceManagement scopeId=\{scopeId\} mode="cleanup"/);
  assert.match(source,/active==='timeline'\?<TimelinePlaceManager/);
  assert.match(source,/active==='quickFill'\?<PlaceBatchFill/);
  assert.doesNotMatch(source,/<details/);
  assert.match(source,/scopeId==='loc'\?PLACE_OPTIONS.filter/);
});
test('Switching the task panel protects unsaved edits via the existing edit dock',()=>{
  const source=read('app/loc/PlaceManagement.jsx');
  assert.match(source,/dock\.switchSection\(next,setSection\)/);
  assert.match(source,/aria-labelledby=\{navId\+'-option-'\+active\}/);
  assert.match(source,/ManagementSectionNav id=\{navId\}/);
});
test('Subnavigation uses theme tokens, visible active/focus state and 2-column mobile grid',()=>{
  const css=read('app/styles/settings-select.css');
  const component=css.slice(css.indexOf('/* Second-level Place Manager navigation.'));
  assert.match(component,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(component,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(component,/\[aria-pressed="true"\]/);
  assert.match(component,/:focus-visible/);
  assert.match(component,/min-height:3\.35rem/);
  assert.doesNotMatch(component,/#[0-9A-Fa-f]{3,8}\b/);
});
