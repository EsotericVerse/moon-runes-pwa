import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {StatisticsFacets} from '../app/loc/statistics-facets.js';
const {mediaFacetDaily,mediaPlatform,mediaStyleTags}=StatisticsFacets.base;

test('URL host and path distinguish IG Reels, posts, Vocus and Suno',()=>{
  assert.equal(mediaPlatform({url:'https://www.instagram.com/reel/ABC/?igsh=abc'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/reels/ABC/'}),'IG Reels');
  assert.equal(mediaPlatform({url:'https://instagram.com/p/ABC/'}),'IG 貼文');
  assert.equal(mediaPlatform({url:'https://vocus.cc/article/ABC'}),'Vocus');
  assert.equal(mediaPlatform({url:'https://suno.com/song/31bf353a-1674-4f47-abca-c606cbd715b0'}),'Suno');
  assert.equal(mediaPlatform({url:'',media_type:'suno'}),'Suno');
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
    {createtime:'2026-10-07T13:00:00+08:00',media_type:'suno'},
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

test('meta_tags counts literal source-language style phrases and explicit classification identifiers',()=>{
  const rows=[
    {createtime:'2026-10-07T12:00:00+08:00',media_type:'suno',meta_tags:'Chinese Classical Hip-Hop, dark boom bap, LunaRunesMusic'},
    {createtime:'2026-10-07T15:00:00+08:00',media_type:'suno',meta_tags:'LunaRunesMusic, dark boom bap'}
  ];
  assert.deepEqual(Object.fromEntries(mediaFacetDaily(rows,'media_style').map(row=>[row.category,row.item_count])),{
    'Chinese Classical Hip-Hop':1,
    'dark boom bap':2,
    'LunaRunesMusic':2
  });
});

test('timestamps aggregate by Taiwan local calendar day even when DB returns UTC',()=>{
  assert.deepEqual(mediaFacetDaily([
    {createtime:'2026-10-07T21:37:51.602041+00:00',media_type:'suno',meta_tags:'LunaRunesMusic'},
    {createtime:'2026-10-08T02:00:00+08:00',media_type:'suno',meta_tags:'LunaRunesMusic'}
  ],'media_style'),[{day:'2026-10-08',category:'LunaRunesMusic',item_count:2}]);
});

test('all valid source Meta Tags remain countable regardless of vocalist spelling',()=>{
  const rows=mediaFacetDaily([
    {createtime:'2026-10-07T12:00:00+08:00',meta_tags:'Male Voice, Dream Pop'},
    {createtime:'2026-10-07T13:00:00+08:00',meta_tags:'Male Vocals, Dream Pop'}
  ],'media_style');
  assert.deepEqual(Object.fromEntries(rows.map(row=>[row.category,row.item_count])),{
    'Dream Pop':2,'Male Voice':1,'Male Vocals':1
  });
});


test('one statistics Object composes media facets with cross and style extensions',()=>{
  assert.equal(StatisticsFacets.base.mediaStyleTags('Dream Pop,Dream Pop').length,1);
  const sample=[{media_id:'song-1',createtime:'2026-10-19',meta_tags:'Dream Pop, Art Pop',media_type:'suno'}];
  const base=StatisticsFacets.base.mediaFacetDaily(sample,'media_style');
  const cross=StatisticsFacets.cross.mediaCrossTagCatalog(sample);
  assert.equal(base.length,2);
  assert.equal(cross.options.length,2);
  assert.equal(StatisticsFacets.style.styleTreeClasses([{class_name:'Pop'}])[0],'Pop');
});


test('statistics management capabilities mount only when their disclosures open',()=>{
  const detail=fs.readFileSync('app/modular/modules/statistics/StatisticsDetails.jsx','utf8');
  const page=fs.readFileSync('app/modular/features/Statistics.jsx','utf8');
  assert.ok(detail.includes("onToggle={event=>setOpen(event.currentTarget.open)}"));
  assert.ok(detail.includes("open?(typeof children==='function'?children():children):null"));
});
