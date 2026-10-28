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

test('Timeline analysis is isolated from initial management entry',()=>{
  const source=read('app/loc/PlaceManagement.jsx');
  // Timeline must be bundled with the management page. Loading its chunk
  // only after selecting the tab can show a 404 instead of the review panel.
  assert.match(source,/^import TimelinePlaceManager from '\.\/TimelinePlaceManager';/m);
  assert.doesNotMatch(source,/dynamic\(\(\)=>import\('\.\/TimelinePlaceManager'/);
  assert.doesNotMatch(source,/recoverChunkOnce/);
  const editor=read('app/loc/TraceManagement.jsx');
  assert.match(editor,/\{mapOpen\?<TraceMap/);
  assert.match(editor,/onClick=\{\(\)=>setMapOpen\(open=>!open\)\}/);
});

test('Service Worker never reuses stale management HTML after a deploy',()=>{
  const sw=read('public/sw.js');
  const self={location:{origin:'https://loc.example'},addEventListener(){}};
  const isPublicHtml=Function('self',sw+'\nreturn isPublicHtml')(self);
  const url=pathname=>({origin:self.location.origin,pathname,search:'',searchParams:new URLSearchParams()});
  const request={mode:'navigate'};
  assert.equal(isPublicHtml(request,url('/lo3rwang/manage/')),false);
  assert.equal(isPublicHtml(request,url('/lo3rwang/manage/search/')),false);
  assert.equal(isPublicHtml(request,url('/lrunes/manage/')),false);
  assert.equal(isPublicHtml(request,url('/lo3rwang/culture/')),true);
});

test('Timeline opens with the configured Auth SDK rather than the query-only database adapter',()=>{
  const timeline=read('app/loc/TimelinePlaceManager.jsx');
  const db=read('app/loc/db-client.mjs');
  const provider=read('app/loc/providers/supabase.mjs');
  const place=read('app/loc/PlaceManagement.jsx');
  assert.match(timeline,/import \{dbAuthClient,dbAuthEvents\} from '\.\/db-client\.mjs';/);
  assert.match(timeline,/dbAuthEvents\.getUser\(\)\.then\(\(\{data\}\)=>\{/);
  assert.doesNotMatch(timeline,/dbAuthClient\.auth/);
  assert.match(db,/export const dbAuthEvents=adapter\.auth;/);
  assert.match(provider,/auth:authenticatedSdk\.auth/);
  assert.match(place,/active==='timeline'\?<TimelinePlaceManager/);
});
