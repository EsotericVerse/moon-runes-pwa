import {CultureTimelineModel} from '../app/modular/modules/culture-timeline/culture-timeline-model.js';
import {blocksToPlainText,looksLikeMarkdown,normalizeBlocks,plainTextToBlocks} from '../app/loc/blocknote-content.mjs';
import {HomeBlock} from '../app/loc/home-block-model.js';
import {importRowsFromJson,mappedImportValue} from '../app/loc/import-batch.mjs';

const failures=[];
const must=(condition,message)=>{if(!condition)failures.push(message);};

must(importRowsFromJson({payload:{entries:[{body:'字'}]}},'payload.entries').length===1,'Import format must select nested array paths');
must(mappedImportValue({data:{body:'甲'}},'content',{content:'data.body'})==='甲','Import mapping must read configured nested fields');

must(blocksToPlainText(plainTextToBlocks('第一段\n第二段'))==='第一段\n第二段','BlockNote converter must preserve paragraph boundaries');
must(normalizeBlocks({html:'<p>原始文字</p>'}).html==='<p>原始文字</p>','BlockNote must preserve legacy HTML hydration');
must(Array.isArray(normalizeBlocks([{type:'paragraph',content:'字'}])),'BlockNote must accept temporary UI editor blocks');
must(looksLikeMarkdown('# 標題\n\n## 小標\n\n- 項目')&&!looksLikeMarkdown('一般文章\n第二段'),'BlockNote must distinguish authored Markdown from ordinary plain text');

must(HomeBlock.limit===8&&HomeBlock.rows([
  {uid:'A',page_name:'index',block_order:4},
  {uid:'B',page_name:'index',block_order:1},
  {uid:'C',page_name:'other',block_order:3},
  {uid:'D',page_name:'index',block_order:8},
  {uid:'E',page_name:'index',block_order:9}
]).map(row=>row.uid).join(',')==='B,A,D','Home page/order must drive display; reject other pages and >8 and render in order');
const colFixture={
  eyebrow:'System Status',title:'系統狀態',subtitle:'<p>系統簡介</p>',
  text:'<h2>目前文字作品</h2><p>已整理</p><h2>系統架構</h2><p>技術模組</p>',
  entities:[
    {uid:'a',title:'',text:'<p>Next.js</p>'},
    {uid:'b',title:'',text:'<p>vis-timeline</p>'},
    {uid:'c',title:'',text:'<p>Zod</p>'},
    {uid:'d',title:'',text:'<p></p>'}
  ]
};
must(HomeBlock.visibleEntities(colFixture).map(entity=>entity.uid).join(',')==='a,b,c','LOC status must show all populated child items in DB order and hide only empty placeholders');
must(HomeBlock.visibleEntities({...colFixture,entities:[{uid:'copy',title:'',text:colFixture.text}]}).length===0,'legacy duplicate whole-body child must not print twice');

const anchorFixture=[
  {entry_type:'anchor',resource_id:'a',date_status:'exact',start_date:'2024-01-01'},
  {entry_type:'anchor',resource_id:'b',date_status:'exact',start_date:'2024-03-01'},
  {entry_type:'anchor',resource_id:'c',date_status:'exact',start_date:'2024-04-01'},
  {entry_type:'anchor',resource_id:'d',date_status:'exact',start_date:'2024-05-01'}
];
const snappedPeriod=CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-01-02',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedPeriod.anchor_ids.join(',')==='a,c'&&snappedPeriod.item.end==='2024-03-31','period range drag must snap to exclusive-end anchor without changing row dates');
const snappedEvent=CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-01-01',end:'2024-04-01'},{entryType:'event',raw:{anchor_ids:['a','b']}},anchorFixture);
must(snappedEvent.anchor_ids.join(',')==='a,c'&&snappedEvent.item.end==='2024-04-01','event range drag must snap inclusive end to actual anchor');
let duplicateAnchorRejected=false;
try{CultureTimelineModel.snapTimelineRangeToAnchors({start:'2024-04-01',end:'2024-03-31'},{entryType:'period',raw:{anchor_ids:['a','b']}},anchorFixture);}catch{duplicateAnchorRejected=true}
must(duplicateAnchorRejected,'period bounds must reject duplicate or reversed anchor ranges');

if(failures.length){
  console.error('[management-contract] verification failed');
  failures.forEach(item=>console.error(' - '+item));
  process.exit(1);
}
console.log('[management-contract] BlockNote converters, Import mapping, Home block ordering and Time anchor snapping verified');
