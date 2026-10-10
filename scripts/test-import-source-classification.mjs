import assert from 'node:assert/strict';
import test from 'node:test';
import {aggregateOwnScopeStatistics,ownScopeCategoryCatalog} from '../app/loc/statistics-source-intersection.mjs';

test('source, work type and multimedia are independent author-controlled dimensions',()=>{
  const texts=[
    {source_name:'facebook',content_type:'post',createtime:'2026-10-01T12:00:00Z'},
    {source_name:'threads',content_type:'reply',createtime:'2026-10-01T13:00:00Z'},
    {source_name:'suno',content_type:'lyrics',createtime:'2026-10-02T13:00:00Z'}
  ];
  const media=[
    {media_type:'instagram',createtime:'2026-10-01T16:00:00Z'},
    {media_type:'suno',createtime:'2026-10-02T16:00:00Z'}
  ];
  const rows=aggregateOwnScopeStatistics(texts,media);
  assert.equal(rows.find(x=>x.day==='2026-10-01'&&x.kind==='source'&&x.category==='facebook')?.item_count,1);
  assert.equal(rows.find(x=>x.day==='2026-10-01'&&x.kind==='source'&&x.category==='threads')?.item_count,1);
  assert.equal(rows.find(x=>x.day==='2026-10-01'&&x.kind==='type'&&x.category==='reply')?.item_count,1);
  assert.equal(rows.find(x=>x.day==='2026-10-01'&&x.kind==='media'&&x.category==='instagram')?.item_count,1);
  assert.equal(rows.find(x=>x.day==='2026-10-01'&&x.kind==='total'&&x.category==='文字作品')?.item_count,2);
  const catalog=ownScopeCategoryCatalog(rows);
  for(const kind of ['source','media','type','total'])assert.ok(catalog.some(row=>row.kind===kind),kind);
  assert.ok(catalog.some(row=>row.kind==='source'&&row.name==='Facebook'));
  assert.ok(catalog.some(row=>row.kind==='media'&&row.name==='instagram'));
});
test('invalid record dates are rejected rather than silently dropping every valid day',()=>{
  const rows=aggregateOwnScopeStatistics([
    {source_name:'facebook',content_type:'post',createtime:'2026-10-11T08:00:00Z'},
    {source_name:'facebook',content_type:'post',createtime:'not-a-date'}
  ],[]);
  assert.equal(rows.filter(x=>x.kind==='source'&&x.category==='facebook').length,1);
});
