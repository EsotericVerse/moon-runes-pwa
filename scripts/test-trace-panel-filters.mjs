import test from 'node:test';
import assert from 'node:assert/strict';
import {
  traceWindow,traceArticleFilters,groupedTraceDays,traceMediaMatches,
  TRACE_MEDIA_TYPES
} from '../app/modular/features/trace/trace-panel-filters.mjs';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('default recent three months respects Taiwan civil day and calendar month boundary',()=>{
  assert.deepEqual(traceWindow('3m',new Date('2026-10-26T12:00:00Z')),
    {startDate:'2026-07-26',endDate:'2026-10-26'});
  assert.deepEqual(traceWindow('all'),{startDate:'',endDate:''});
  assert.deepEqual(traceWindow('3m',new Date('2026-05-31T08:00:00Z')),
    {startDate:'2026-02-28',endDate:'2026-05-31'});
});

test('Threads is an exact case-insensitive source filter, not a media subtype',()=>{
  const filters=traceArticleFilters(['板橋車站'],{
    startDate:'2026-07-26',endDate:'2026-10-26',sourceName:'Threads'
  });
  assert.ok(filters.some(f=>f.column==='source_place'&&f.operator==='eq'&&f.value==='板橋車站'));
  assert.ok(filters.some(f=>f.column==='source_name'&&f.operator==='ilike'&&f.value==='Threads'));
  assert.ok(filters.some(f=>f.column==='createtime'&&f.operator==='gte'));
  assert.ok(filters.some(f=>f.column==='createtime'&&f.operator==='lte'));
  assert.ok(!filters.some(f=>f.column==='media_type'));
});

test('media choices use real type labels and only galaxy_link-linked articles',()=>{
  assert.deepEqual([...TRACE_MEDIA_TYPES],['音樂','圖片','影片']);
  const articles=[{uid:'AAAAAAAA',title:'Threads image'},{uid:'BBBBBBBB',title:'unrelated'}];
  assert.deepEqual(traceMediaMatches(articles,[{galaxy_link:'AAAAAAAA',media_type:'圖片'}]),
    [articles[0]]);
});

test('count groups only from selected metadata; never invent dates',()=>{
  const rows=[
    {source_place:'板橋車站',createtime:'2026-10-01T12:00:00+08:00'},
    {source_place:'板橋車站',createtime:'2026-10-01T16:00:00+08:00'},
    {source_place:'',createtime:'2026-10-01T16:00:00+08:00'},
    {source_place:'板橋車站',createtime:null}
  ];
  assert.deepEqual(groupedTraceDays(rows),[
    {day:'2026-10-01',category:'板橋車站',item_count:2}
  ]);
});

test('UI loads only the Frame index on entry; selected sites and report stay gated',()=>{
  const trace=read('app/modular/features/Trace.jsx');
  const result=read('app/modular/features/trace/TracePlaceResults.jsx');
  assert.match(trace,/\[routeListOpen\]=useState\(true\)/);
  assert.match(trace,/queryFn:\(\)=>readTraceMapIndex\(periodScopeId\)/);
  assert.match(trace,/enabled:supported&&routeListOpen/);
  assert.match(trace,/\[reportTab,setReportTab\]=useState\('articles'\)/);
  // An historical Frame intentionally starts with its complete time range.
  assert.match(trace,/\[timeWindow,setTimeWindow\]=useState\('all'\)/);
  assert.match(trace,/enabled:supported&&routeListOpen&&traceIndex\.data!==undefined&&\(Boolean\(currentMap\)\|\|showingAll\)/);
  assert.match(trace,/readCurrentTraceAnchors\(periodScopeId,currentMap\.anchor_list\)/);
  assert.match(trace,/!mapOnly&&reportPlace\?<TracePlaceResults/);
  assert.match(trace,/sourceName=\{sourceName\} mediaType=\{mediaType\}/);
  assert.match(result,/mediaFiltered=useAsyncResource/);
  assert.match(result,/galaxy_link,media_type/);
  assert.match(result,/sourceFilter/);
  assert.match(result,/filteredDaily/);
  assert.match(result,/summary.data/);
  assert.doesNotMatch(trace,/readAllTraceAnchors\(periodScopeId\)[\s\S]*?enabled:supported,queryFn/);
});
