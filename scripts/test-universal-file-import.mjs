import test from 'node:test';
import assert from 'node:assert/strict';
import {officeTableRows,parseUniversalImportFile} from '../app/loc/universal-file-import.mjs';

const f=(name,text='placeholder')=>({name,size:text.length,text:async()=>text});
const cell=(column,text)=>({type:'cell',text,metadata:{col:column}});
const row=(...cells)=>({type:'row',children:cells});
const ast=(...sheets)=>({content:sheets});
const sheet=(name,...rows)=>({type:'sheet',metadata:{sheetName:name},children:rows});

test('CSV/XLSX AST preserves sparse cell columns and exact source headers',async()=>{
  const parsed=officeTableRows(ast(sheet('Posts',
    row(cell(0,'title'),cell(1,'content'),cell(3,'url')),
    row(cell(0,'作品甲'),cell(1,'第一行\n第二行'),cell(3,'https://example.org/p/1')),
    row(cell(0,'作品乙'),cell(3,'https://example.org/p/2'))
  )));
  assert.equal(parsed.length,2);
  assert.equal(parsed[0].title,'作品甲');
  assert.equal(parsed[0].content,'第一行\n第二行');
  assert.equal(parsed[0].url,'https://example.org/p/1');
  assert.equal(parsed[1].content,'');
  assert.equal(parsed[1].__source_sheet,'Posts');
});

test('duplicate or unsafe source headers fail rather than overwriting fields',()=>{
  assert.throws(()=>officeTableRows(ast(sheet('a',row(cell(0,'title'),cell(1,'title')),row(cell(0,'a'),cell(1,'b'))))),/重複或不安全/);
  assert.throws(()=>officeTableRows(ast(sheet('a',row(cell(0,'__proto__')),row(cell(0,'a'))))),/重複或不安全/);
});

test('CSV and TSV use the shared office parser and keep mapping for LOC',async()=>{
  const calls=[];
  const parser={async parseOffice(file,options){
    calls.push({name:file.name,options});
    return ast(sheet('Sheet1',row(cell(0,'title'),cell(1,'content')),row(cell(0,'測試'),cell(1,'原文'))));
  }};
  const csv=await parseUniversalImportFile(f('posts.csv'),{officeParser:parser});
  const tsv=await parseUniversalImportFile(f('posts.tsv'),{officeParser:parser});
  assert.equal(csv[0].content,'原文');
  assert.equal(tsv[0].title,'測試');
  assert.equal(calls[0].options.fileType,'csv');
  assert.equal(calls[1].options.csvDelimiter,'\t');
});

test('office document yields a source-faithful text record without invented tags',async()=>{
  const parser={async parseOffice(){return {metadata:{title:'真實標題',created:'2026-10-17'},async to(){return {value:'第一段\n第二段'};}};}};
  const parsed=await parseUniversalImportFile(f('memo.docx'),{officeParser:parser});
  assert.deepEqual(parsed,[{title:'真實標題',content:'第一段\n第二段',source_place:'memo.docx',createtime:'2026-10-17'}]);
});

test('JSON continues through the pre-existing mapper with recordPath',async()=>{
  const rows=await parseUniversalImportFile(f('export.json',JSON.stringify({payload:{entries:[{title:'舊格式',body:'原文'}]}})),{recordPath:'payload.entries'});
  assert.equal(rows[0].body,'原文');
});

test('unsupported inputs are rejected, never silently coerced to articles',async()=>{
  await assert.rejects(parseUniversalImportFile(f('music.mp3')),/不支援/);
});

test('installed universal parser reads a real UTF-8 CSV as separate records',async()=>{
  const file=new File(['title,content,url\n測試作品,"第一行, 第二行",https://example.org/p/1\n'],'actual.csv',{type:'text/csv'});
  const records=await parseUniversalImportFile(file);
  assert.equal(records.length,1);
  assert.equal(records[0].title,'測試作品');
  assert.equal(records[0].content,'第一行, 第二行');
  assert.equal(records[0].url,'https://example.org/p/1');
});
