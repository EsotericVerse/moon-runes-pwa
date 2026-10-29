import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

// Load the pure statistics module directly. Do not duplicate its
// source-place/platform classification rules in the regression test.
const source=readFileSync(new URL('../app/loc/statistics-facets.js',import.meta.url),'utf8');
const {mediaPlatform,mediaFacetDaily}=await import(
  'data:text/javascript;charset=utf-8,'+encodeURIComponent(source)
);

test('A check-in place and media type are never platform evidence',()=>{
  assert.equal(mediaPlatform({location:'suno',media_type:'音樂'}),'其他／無法辨識');
  assert.equal(mediaPlatform({location:'Instagram',media_type:'suno'}),'其他／無法辨識');
  assert.equal(mediaPlatform({location:'ChatGPT / Suno Style',url:'invalid url'}),'其他／無法辨識');
});

test('A valid media URL determines platform independently of check-in place',()=>{
  assert.equal(mediaPlatform({location:'板橋車站',url:'https://suno.com/song/example'}),'Suno');
  assert.equal(mediaPlatform({location:'suno',url:'https://www.instagram.com/reel/example'}),'IG Reels');
  assert.equal(mediaPlatform({location:'Facebook',url:'https://www.youtube.com/shorts/example'}),'YouTube Shorts');
  assert.equal(mediaPlatform({location:'suno',url:'https://example.com/suno'}),'example.com');
  assert.equal(mediaPlatform({location:'suno',url:'https://evil.suno.com.example.net/song/example'}),'evil.suno.com.example.net');
});

test('Media platform statistics never count a place string as a platform',()=>{
  const rows=[
    {createtime:'2026-10-25',location:'suno',media_type:'音樂'},
    {createtime:'2026-10-25',location:'烘爐地南山福德宮',media_type:'音樂',url:'https://suno.com/song/example'}
  ];
  const counts=mediaFacetDaily(rows,'media_platform');
  assert.deepEqual(counts.map(row=>[row.category,row.item_count]).sort((a,b)=>a[0].localeCompare(b[0])),
    [['Suno',1],['其他／無法辨識',1]].sort((a,b)=>a[0].localeCompare(b[0])));
});
