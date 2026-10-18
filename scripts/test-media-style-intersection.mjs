import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaultMediaCrossAxes,mediaCrossIntersections,mediaCrossPairWorks,mediaCrossTagCatalog} from '../app/loc/media-style-intersection.mjs';

const data=[
  {media_id:'a',title:'作品甲',url:'https://example.com/a',createtime:'2026-06-08T22:00:00+00:00',meta_tags:'Mandopop, Dream Pop, Alternative Pop, Neo-Soul, dream pop'},
  {media_id:'b',title:'作品乙',createtime:'2026-06-09T09:00:00+08:00',meta_tags:'J-Pop, Indie Pop'},
  {media_id:'c',title:'作品丙',createtime:'2026-06-10T09:00:00+08:00',meta_tags:'K-Pop, Dream Pop'},
  {media_id:'d',title:'作品丁',createtime:'2026-06-11T09:00:00+08:00',meta_tags:'Alternative Pop, Art Pop'},
  {media_id:'e',title:'作品戊',createtime:'2026-06-12T09:00:00+08:00',meta_tags:'Mandopop'},
  {media_id:'f',createtime:'2026-06-12T09:00:00+08:00',meta_tags:''},
  {media_id:'a',title:'作品甲',createtime:'2026-06-08T22:00:00+00:00',meta_tags:'Mandopop, Dream Pop'}
];

test('available choices come only from real metadata and duplicate media ids count once',()=>{
  const catalog=mediaCrossTagCatalog(data);
  assert.equal(catalog.media.length,5);
  assert.equal(catalog.options.some(x=>x.label==='Made Up Pop'),false);
  assert.equal(catalog.options.find(x=>x.label==='Dream Pop').count,2);
  assert.equal(catalog.options.find(x=>x.label==='Mandopop').count,2);
  assert.equal(catalog.media.find(x=>x.id==='a').day,'2026-06-09');
});
test('Mando, J and K are default selections only when observed',()=>{
  const catalog=mediaCrossTagCatalog(data);
  const selected=defaultMediaCrossAxes(catalog);
  assert.deepEqual(new Set(selected.left),new Set(['mandopop','j-pop','k-pop']));
  assert.equal(selected.right.includes('indie pop'),true);
  const noK=mediaCrossTagCatalog([{media_id:'x',meta_tags:'J-Pop, Indie Pop'}]);
  assert.deepEqual(defaultMediaCrossAxes(noK).left,['j-pop']);
});
test('intersections require both tags on the same media record and exclude self pairs',()=>{
  const catalog=mediaCrossTagCatalog(data);
  const {left,right}=defaultMediaCrossAxes(catalog);
  const results=mediaCrossIntersections(catalog,left,right);
  const pairs=Object.fromEntries(results.map(x=>[x.leftLabel+' × '+x.rightLabel,x.count]));
  assert.equal(pairs['Mandopop × Dream Pop'],1);
  assert.equal(pairs['Mandopop × Alternative Pop'],1);
  assert.equal(pairs['J-Pop × Indie Pop'],1);
  assert.equal(pairs['K-Pop × Dream Pop'],1);
  assert.equal(pairs['Mandopop × Indie Pop'],undefined);
  const dreamPopPair=results.find(x=>x.leftLabel==='Mandopop'&&x.rightLabel==='Dream Pop');
  assert.equal('media' in dreamPopPair,false);
  assert.deepEqual(mediaCrossPairWorks(catalog,dreamPopPair).map(item=>item.id),['a']);
  assert.equal(dreamPopPair.days.get('2026-06-09'),1);
});
test('user may compare any metadata tags and not only pop families',()=>{
  const catalog=mediaCrossTagCatalog(data);
  const rows=mediaCrossIntersections(catalog,['alternative pop'],['art pop','dream pop','alternative pop']);
  assert.deepEqual(new Set(rows.map(r=>r.rightLabel)),new Set(['Art Pop','Dream Pop']));
  assert.equal(rows.every(r=>r.count===1),true);
});
test('unobserved default labels must not be invented',()=>{
  const catalog=mediaCrossTagCatalog([{media_id:'a',meta_tags:'Dream Pop, Art Pop'}]);
  assert.deepEqual(defaultMediaCrossAxes(catalog).left,[]);
  assert.deepEqual(mediaCrossIntersections(catalog,[],['dream pop']).length,0);
});
