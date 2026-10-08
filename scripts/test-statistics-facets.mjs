import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_MEDIA_STYLE_EXCLUSIONS,filterMediaStyleRows,mediaFacetDaily,mediaPlatform,mediaStyleExclusions,mediaStyleTags} from '../app/loc/statistics-facets.mjs';

test('URL host and path distinguish IG Reels, posts, Vocus and Suno',()=>{
  assert.equal(mediaPlatform({url:'https://www.instagram.com/reel/ABC/?igsh=abc'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/reels/ABC/'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/p/ABC/'}),'IG 貼文');
  assert.equal(mediaPlatform({url:'https://vocus.cc/article/ABC'}),'Vocus');
  assert.equal(mediaPlatform({url:'https://suno.com/song/31bf353a-1674-4f47-abca-c606cbd715b0'}),'Suno');
  assert.equal(mediaPlatform({url:'',media_type:'suno',source_native_id:'31bf353a-1674-4f47-abca-c606cbd715b0'}),'Suno');
  assert.equal(mediaPlatform({url:'',media_type:'instagram',source_place:'Reels'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://youtube.com/shorts/abc'}),'YouTube Shorts');
  assert.equal(mediaPlatform({url:'https://my-videos.example.net/watch/123'}),'my-videos.example.net');
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
    {day:'2026-10-07',category:'未標記 Meta Tag',item_count:1}
  ]);
});

test('meta_tags includes descriptive metadata terms, not only music genres',()=>{
  const rows=[
    {createtime:'2026-10-07T12:00:00+08:00',media_type:'suno',meta_tags:'Alternative Pop, 政德風, 男聲, 希望向'},
    {createtime:'2026-10-07T15:00:00+08:00',media_type:'suno',meta_tags:'政德風, 希望向'}
  ];
  assert.deepEqual(Object.fromEntries(mediaFacetDaily(rows,'media_style').map(row=>[row.category,row.item_count])),{
    'Alternative Pop':1,
    '政德風':2,
    '男聲':1,
    '希望向':2
  });
});

test('timestamps aggregate by Taiwan local calendar day even when DB returns UTC',()=>{
  assert.deepEqual(mediaFacetDaily([
    {createtime:'2026-10-07T21:37:51.602041+00:00',media_type:'suno',meta_tags:'政德風'},
    {createtime:'2026-10-08T02:00:00+08:00',media_type:'suno',meta_tags:'政德風'}
  ],'media_style'),[{day:'2026-10-08',category:'政德風',item_count:2}]);
});

test('male-voice stopword is excluded by default while meaningful high-frequency tags remain',()=>{
  const rows=mediaFacetDaily([
    {createtime:'2026-10-07T12:00:00+08:00',meta_tags:'男聲,政德風,希望向,Alternative Pop'},
    {createtime:'2026-10-07T13:00:00+08:00',meta_tags:'男聲,政德風,希望向'}
  ],'media_style');
  assert.deepEqual(DEFAULT_MEDIA_STYLE_EXCLUSIONS,['男聲']);
  assert.deepEqual(Object.fromEntries(filterMediaStyleRows(rows).map(row=>[row.category,row.item_count])),{
    'Alternative Pop':1,'希望向':2,'政德風':2
  });
  assert.equal(filterMediaStyleRows(rows,[]).some(row=>row.category==='男聲'),true);
  assert.equal(filterMediaStyleRows(rows,['男聲','希望向']).some(row=>row.category==='希望向'),false);
  assert.deepEqual(mediaStyleExclusions('男聲, 男聲， 希望向'),['男聲','希望向']);
});
