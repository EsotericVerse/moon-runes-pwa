import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import {normalizeIsrDomains,MAX_ISR_DOMAINS} from '../app/loc/providers/isr-domains.mjs';

const domain=(label,origin='')=>({label,origin});

test('ISR destinations require only display name and full HTTPS domain',()=>{
  const rows=normalizeIsrDomains([domain('ISR 1','https://isr.example.org'),domain('ISR 2','https://edge.example.org')]);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{label:'ISR 1',origin:'https://isr.example.org'});
  assert.equal('id' in rows[0],false);
  assert.equal(MAX_ISR_DOMAINS,32);
  assert.deepEqual(normalizeIsrDomains([]),[]);
});

test('invalid or duplicate domain URLs are rejected',()=>{
  assert.throws(()=>normalizeIsrDomains([domain('A','https://isr.example.org'),domain('B','https://isr.example.org')]),/不可重複/);
  assert.throws(()=>normalizeIsrDomains([domain('A','http://isr.example.org')]),/HTTPS/);
  assert.throws(()=>normalizeIsrDomains([domain('A')]),/HTTPS/);
  assert.throws(()=>normalizeIsrDomains([domain('')]),/名稱/);
});

test('Admin network forms support editing, add/remove and Edit Dock save',()=>{
  const isr=readFileSync(new URL('../app/loc/views/admin-panels/IsrDomainTarget.jsx',import.meta.url),'utf8');
  const db=readFileSync(new URL('../app/loc/views/admin-panels/DatabaseTarget.jsx',import.meta.url),'utf8');
  for(const code of [isr,db])assert.ok(parse(code,{sourceType:'module',plugins:['jsx']}));
  assert.match(isr,/onClick=\{addDomain\}/);
  assert.match(isr,/onClick=\{\(\)=>removeDomain\(index\)\}/);
  assert.match(isr,/useEditDockForm\(\{save,isDirty:/);
  assert.doesNotMatch(isr,/Domain ID/);
  assert.match(db,/onClick=\{add\}/);
  assert.match(db,/onClick=\{remove\}/);
  assert.match(db,/\.delete\(\)\.eq\('target_id',row\.target_id\)\.select\('target_id'\)/);
  assert.match(db,/data\?\.length!==1/);
});

test('Culture preserves first-paint totals and requests redraw when source rows arrive',()=>{
  const culture=readFileSync(new URL('../app/modular/features/Culture.jsx',import.meta.url),'utf8');
  const view=readFileSync(new URL('../app/modular/modules/culture-timeline/CultureTimeline.jsx',import.meta.url),'utf8');
  assert.match(culture,/items\.push\(flatRow\('root:'\+parent\.id,parentCount,label,parent\.order,'source_total'\)\)/);
  assert.doesNotMatch(culture,/sourceRootDailyDensity/);
  assert.match(view,/rows\.some\(row=>row\.entryType==='source_total'\)/);
  assert.match(view,/window\.requestAnimationFrame\(\(\)=>\{/);
  assert.match(view,/timelineRef\.current\.redraw\(\)/);
});
