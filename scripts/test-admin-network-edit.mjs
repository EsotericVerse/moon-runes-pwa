import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import {normalizeIsrDomains,MAX_ISR_DOMAINS} from '../app/loc/providers/isr-domains.mjs';

const domain=(id,origin='')=>({id,label:id,origin});

test('Admin can add ISR domains while keeping unconfigured entries inactive',()=>{
  const rows=normalizeIsrDomains([domain('cloudflare'),domain('my-isr','https://isr.example.org')],'my-isr',{allowEmptyOrigin:true});
  assert.equal(rows.length,2);
  assert.equal(rows[0].origin,'');
  assert.equal(rows[1].origin,'https://isr.example.org');
  assert.equal(MAX_ISR_DOMAINS,32);
});
test('Admin rejects duplicate ISR IDs, duplicate origins, and HTTP targets',()=>{
  assert.throws(()=>normalizeIsrDomains([domain('alpha'),domain('alpha')],'alpha',{allowEmptyOrigin:true}),/ID 不可重複/);
  assert.throws(()=>normalizeIsrDomains([domain('alpha','https://isr.example.org'),domain('beta','https://isr.example.org')],'alpha',{allowEmptyOrigin:true}),/Domain 不可重複/);
  assert.throws(()=>normalizeIsrDomains([domain('alpha','http://isr.example.org')],'alpha',{allowEmptyOrigin:true}),/HTTPS/);
  assert.throws(()=>normalizeIsrDomains([domain('alpha')],'alpha'),/HTTPS/);
});
test('Admin network forms have real add, remove and verified save actions',()=>{
  const isr=readFileSync(new URL('../app/loc/views/admin-panels/IsrDomainTarget.jsx',import.meta.url),'utf8');
  const db=readFileSync(new URL('../app/loc/views/admin-panels/DatabaseTarget.jsx',import.meta.url),'utf8');
  for(const code of [isr,db])assert.ok(parse(code,{sourceType:'module',plugins:['jsx']}));
  assert.match(isr,/onClick=\{addDomain\}/);
  assert.match(isr,/onClick=\{\(\)=>removeDomain\(item\.id\)\}/);
  assert.match(isr,/useEditDockForm\(\{save,isDirty:/);
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
