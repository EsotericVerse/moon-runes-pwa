import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readImportCandidatesByTimeWindows} from '../app/loc/import-duplicate-check.mjs';

const instant=second=>new Date(Date.UTC(2024,0,1,0,0,second)).toISOString();

test('three SELECT lanes compare independent, disjoint source-time windows',async()=>{
  const dates=Array.from({length:9},(_,i)=>instant(i));
  const windows=[],spool=[],progress=[];
  let active=0,peak=0,started=0,release;
  const barrier=new Promise(resolve=>{release=resolve;});
  await readImportCandidatesByTimeWindows(dates,{
    concurrency:3,windowSize:1000,
    readWindow:async(start,end)=>{
      active++;peak=Math.max(peak,active);
      windows.push([start,end]);started++;
      if(started===3)release();
      await barrier;
      active--;
      return dates.filter(t=>t>=start&&t<=end)
        .map(time=>({uid:time,createtime:time}));
    },
    readRowsByUid:async ids=>ids.map(uid=>({uid,createtime:uid})),
    consumePage:page=>spool.push(...page),
    onWindowDone:n=>progress.push(n)
  });
  assert.equal(peak,3);
  assert.deepEqual(windows,[[instant(0),instant(2)],
    [instant(3),instant(5)],[instant(6),instant(8)]]);
  assert.equal(spool.length,9);
  assert.equal(new Set(spool.map(row=>row.uid)).size,9);
  assert.equal(progress.at(-1),9);
});

test('same-timestamp candidates are never divided between lanes',async()=>{
  const first=instant(1),second=instant(2),third=instant(3);
  const source=[{uid:'AA000001',createtime:first},
    {uid:'BB000002',createtime:first},
    {uid:'CC000003',createtime:second},
    {uid:'DD000004',createtime:third}];
  const windows=[],spool=[];
  await readImportCandidatesByTimeWindows([first,first,second,third],{
    concurrency:3,windowSize:1,
    readWindow:async(start,end)=>{
      windows.push([start,end]);
      // An unrelated timestamp must be ignored by this lane.
      return [...source.filter(row=>row.createtime>=start&&row.createtime<=end),
        {uid:'EXTRA000',createtime:instant(9)}];
    },
    readRowsByUid:async uids=>source.filter(row=>uids.includes(row.uid)),
    consumePage:rows=>spool.push(...rows)
  });
  assert.deepEqual(windows,[[first,first],[second,second],[third,third]]);
  assert.equal(spool.length,4);
  assert.equal(spool.filter(row=>row.createtime===first).length,2);
});

test('failed SELECT settles all in-flight lanes before rejecting',async()=>{
  const dates=Array.from({length:6},(_,i)=>instant(i));
  const done=[];
  await assert.rejects(()=>readImportCandidatesByTimeWindows(dates,{
    concurrency:3,windowSize:2,
    readWindow:async(start)=>{
      if(start===instant(0))throw Error('read failed');
      await Promise.resolve();
      done.push(start);
      return [];
    },
    readRowsByUid:async()=>[],
    consumePage:()=>{}
  }),/read failed/);
  assert.deepEqual(done,[instant(2),instant(4)]);
});

test('time-window import uses indexed UID keyset instead of timestamp offsets',()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const timeRead=panel.slice(panel.indexOf('const readSiteSpan=async('),
    panel.indexOf('const readRowsByUid=async'));
  assert.match(timeRead,/\.order\('uid',\{ascending:true\}\)/);
  assert.match(timeRead,/\.gt\('uid',afterUid\)/);
  assert.match(timeRead,/\.range\(0,pageSize-1\)/);
  assert.doesNotMatch(timeRead,/\.order\('createtime'/);
  assert.match(panel,/windowSize:Math\.min\(MAX_ROWS,1000\),concurrency:3/);
});

test('equal timestamps crossing page boundaries are all read exactly once',async()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const section=panel.slice(panel.indexOf('const readSiteSpan=async('),
    panel.indexOf('const readRowsByUid=async'));
  const factory=new Function('dbAuthRelation','galaxy','MAX_ROWS',
    section+'\nreturn readSiteSpan;');
  const rows=[
    {uid:'AA000001',createtime:instant(1)},
    {uid:'BB000002',createtime:instant(1)},
    {uid:'CC000003',createtime:instant(1)},
    {uid:'DD000004',createtime:instant(2)}
  ];
  const cursors=[],ranges=[];
  const query={
    gt:(key,value)=>{assert.equal(key,'uid');cursors.push(value);return query;},
    order:()=>query,
    range:async(start,end)=>{
      ranges.push([start,end]);
      return {data:rows.filter(row=>!cursors.length||
        row.uid>cursors.at(-1)).slice(start,end+1),error:null};
    }
  };
  const relation=()=>({
    select:()=>({ilike:()=>({gte:()=>({lte:()=>query})})})
  });
  const read=factory(relation,'silver.lo3rwang_galaxy',2);
  const result=await read('Facebook',instant(1),instant(2));
  assert.deepEqual(result,rows);
  assert.deepEqual(cursors,['BB000002','DD000004']);
  assert.deepEqual(ranges,[[0,1],[0,1],[0,1]]);
});

test('duplicate rows in successive cursor pages are rejected instead of silently matching',async()=>{
  const panel=readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  const section=panel.slice(panel.indexOf('const readSiteSpan=async('),
    panel.indexOf('const readRowsByUid=async'));
  let pages=0;
  const chain={
    select:()=>chain,ilike:()=>chain,gte:()=>chain,lte:()=>chain,gt:()=>chain,
    order:()=>chain,range:async()=>({data:pages++?[
      {uid:'AA000001',createtime:instant(1)}
    ]:[
      {uid:'AA000001',createtime:instant(1)},
      {uid:'BB000002',createtime:instant(1)}
    ],error:null})
  };
  const read=new Function('dbAuthRelation','galaxy','MAX_ROWS',
    section+'\nreturn readSiteSpan;')(()=>chain,'silver.lo3rwang_galaxy',2);
  await assert.rejects(()=>read('Facebook',instant(1),instant(1)),/重複或無效文章 UID/);
});
