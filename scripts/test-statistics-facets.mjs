import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mediaFacetDaily,mediaPlatform,mediaStyleTags} from '../app/loc/statistics-facets.mjs';

test('URL host and path distinguish IG Reels, posts, Vocus and Suno',()=>{
  assert.equal(mediaPlatform({url:'https://www.instagram.com/reel/ABC/?igsh=abc'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/reels/ABC/'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/p/ABC/'}),'IG 貼文');
  assert.equal(mediaPlatform({url:'https://vocus.cc/article/ABC'}),'Vocus');
  assert.equal(mediaPlatform({url:'https://suno.com/song/31bf353a-1674-4f47-abca-c606cbd715b0'}),'Suno');
  assert.equal(mediaPlatform({url:'',media_type:'suno',source_native_id:'31bf353a-1674-4f47-abca-c606cbd715b0'}),'Suno');
  assert.equal(mediaPlatform({url:'',media_type:'instagram',source_place:'Reels'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://youtube.com/shorts/abc'}),'YouTube Shorts');
});

test('style tags are independent, deduplicated, and preserve multiword genres',()=>{
  assert.deepEqual(mediaStyleTags('Alternative Pop, Dream Pop,alternative pop；Indie Rock'),['Alternative Pop','Dream Pop','Indie Rock']);
  assert.deepEqual(mediaStyleTags(''),[]);
});

test('platform counts media rows rather than URL native IDs or linked Galaxy texts',()=>{
  const rows=[
    {createtime:'2026-10-07T12:00:00+08:00',media_type:'suno',url:'https://suno.com/song/one'},
    {createtime:'2026-10-07T13:00:00+08:00',media_type:'suno',source_native_id:'two'},
    {createtime:'2026-10-07T13:00:00+08:00',url:'https://www.instagram.com/reel/three'},
    {createtime:null,url:'https://vocus.cc/article/four'}
  ];
  assert.deepEqual(mediaFacetDaily(rows,'media_platform'),[
    {day:'2026-10-07',category:'IG Reels',item_count:1},
    {day:'2026-10-07',category:'Suno',item_count:2}
  ]);
});

test('each style counts once per media record; missing tags are visible',()=>{
  const rows=[
    {createtime:'2026-10-07T12:00:00+08:00',meta_tags:'Alternative Pop, alternative pop, Rock'},
    {createtime:'2026-10-07T13:00:00+08:00',meta_tags:'Alternative Pop'},
    {createtime:'2026-10-07T14:00:00+08:00',meta_tags:''}
  ];
  assert.deepEqual(mediaFacetDaily(rows,'media_style'),[
    {day:'2026-10-07',category:'Alternative Pop',item_count:2},
    {day:'2026-10-07',category:'Rock',item_count:1},
    {day:'2026-10-07',category:'未標記曲風',item_count:1}
  ]);
});
