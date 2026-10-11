import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {RUNE_ALL_DRAW_MODES} from '../app/lrunes/rune-draw-modes.mjs';

// Execute the actual existing draw functions from their JSX module without
// duplicating the implementation in tests. All DB calls are intercepted.
const source=readFileSync(resolve('app/lrunes/RuneDrawClient.jsx'),'utf8');
const loaderSource=source.slice(
  source.indexOf('async function loadVerseOnlyCards('),
  source.indexOf('\nasync function loadRuneCard(')
);
assert.match(loaderSource,/async function loadDrawCards/);
const readDraw=selectRows=>new Function(
  'selectRows','RUNE_COLUMNS',
  loaderSource+'; return loadDrawCards;'
)(selectRows,'rune_id,rune_name,card_attr');
const grammarSource=source.slice(
  source.indexOf('function runeEtcText('),
  source.indexOf('\nfunction DrawSelection(')
);
assert.match(grammarSource,/function buildFixedReading/);
const buildReading=new Function(
  'RUNE_DIRECTIONS','RUNE_ALL_DRAW_MODES','buildSpreadAdvice',
  grammarSource+'; return buildFixedReading;'
)(['正位','半正位','半逆位','逆位'],RUNE_ALL_DRAW_MODES,()=>({trend:'持平'}));
const surface=readFileSync(resolve('app/lrunes/RuneSingleDailySurface.jsx'),'utf8');
const singleFunctions=surface.slice(
  surface.indexOf('function directionNo('),
  surface.indexOf('\nexport default function RuneSingleDailySurface(')
);
assert.match(singleFunctions,/function dailySections/);
const {lotSections,dailySections}=new Function(singleFunctions+';return {lotSections,dailySections};')();

function mockDatabase({missingType='',special=false}={}){
  const queries=[];
  const read=async(table,options)=>{
    queries.push({table,...options});
    assert.ok(!options.orFilter,'no bulk OR queries are allowed');
    if(table==='silver.runes'){
      const filter=options.filters.find(f=>f.column==='rune_id');
      const ids=(filter.operator==='in'?filter.value:[filter.value]).map(Number);
      return {dataSource:'primary',rows:ids.slice().sort((a,b)=>a-b).map(id=>({
        rune_id:id,rune_name:'符'+id,card_attr:1
      }))};
    }
    assert.equal(table,'silver.runes_etc');
    assert.ok(['type,desc','desc'].includes(options.columns),'only required ETC columns');
    const filter=key=>options.filters.find(f=>f.column===key)?.value;
    const id=Number(filter('rune_id'));
    const dir=Number(filter('dir'));
    assert.ok(id>0&&id<=66);
    assert.ok(dir>=1&&dir<=4);
    assert.equal(options.source,'primary');
    assert.equal(options.filters.find(f=>f.column==='rune_id').operator,'eq');
    assert.equal(options.filters.find(f=>f.column==='dir').operator,'eq');
    const types=[filter('type')].flat();
    assert.ok(options.limit<=types.length,'fetch must be bounded');
    if(types.some(x=>['sit_q','sit_a','daily_r','daily_g','daily_b'].includes(x))){
      assert.equal(filter('current_moon'),'滿月');
    }
    const rows=types.filter(type=>{
      if(type===missingType)return false;
      if(special&&id>=65&&['daily_r','daily_g','daily_b'].includes(type))return false;
      return true;
    }).map(type=>{
      const desc=type==='sit_q'?'句'+id+'位'+dir:
        type==='lots'?'愛情：本心清楚。事業：起點明確。\n關係：自我穩定。健康：精神聚焦。':
        '文字-'+type;
      return options.columns==='desc'?{desc}:{type,desc};
    });
    return {rows,dataSource:'primary'};
  };
  return {read,queries};
}

test('single: original lot, direction and moon phrases are fully present',async()=>{
  const db=mockDatabase(),direction='正位';
  const [card]=await readDraw(db.read)([{runeNumber:2,dir:1}],{
    staticTypes:['direction','lots'],moonTypes:['sit_q','sit_a'],currentMoon:'滿月'
  });
  assert.deepEqual(Object.keys(card.rune_etc).sort(),['direction','lots','sit_a','sit_q']);
  assert.deepEqual(lotSections(card,direction).map(x=>x.text),
    ['本心清楚','起點明確','自我穩定','精神聚焦']);
  assert.equal(db.queries.filter(q=>q.table==='silver.runes_etc').length,2);
});

test('daily: all five canonical texts displayed, one short moon query',async()=>{
  const db=mockDatabase();
  const [card]=await readDraw(db.read)([{runeNumber:12,dir:4}],{
    staticTypes:['direction'],moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b'],currentMoon:'滿月'
  });
  assert.deepEqual(dailySections(card,'逆位').map(x=>x.label),[
    '狀況形容','狀況表達','每日占卜提醒','每日占卜引導','每日占卜祝福'
  ]);
  assert.equal(db.queries.filter(q=>q.table==='silver.runes_etc').length,2);
  assert.equal(db.queries.filter(q=>q.table==='silver.runes_etc').at(-1).limit,5);
});

for(const mode of RUNE_ALL_DRAW_MODES.filter(m=>m.count>=2)){
  test(mode.count+'-card: N exact sit_q reads, one combined verse in draw order',async()=>{
    const db=mockDatabase();
    const pairs=Array.from({length:mode.count},(_,i)=>({runeNumber:mode.count+20-i,dir:i%4+1}));
    const cards=await readDraw(db.read)(pairs,{
      staticTypes:[],moonTypes:['sit_q'],currentMoon:'滿月'
    });
    assert.deepEqual(cards.map(c=>c.rune_id),pairs.map(x=>x.runeNumber));
    const reads=db.queries.filter(q=>q.table==='silver.runes_etc');
    assert.equal(reads.length,mode.count);
    assert.ok(reads.every(q=>q.columns==='desc'&&q.limit===1&&q.filters.length===4));
    const verse=buildReading(cards,pairs.map(p=>['正位','半正位','半逆位','逆位'][p.dir-1]),mode.key).sentence;
    for(const pair of pairs)assert.ok(verse.includes('句'+pair.runeNumber+'位'+pair.dir),verse);
    assert.ok(verse.endsWith('。')&&!verse.includes('資訊不足'),verse);
  });
}

test('missing daily content is a visible error, not silent 今日指引 fallback',async()=>{
  const db=mockDatabase({missingType:'daily_g'});
  await assert.rejects(()=>readDraw(db.read)([{runeNumber:10,dir:2}],{
    staticTypes:['direction'],moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b'],currentMoon:'滿月'
  }),/籤詩資料未讀取完整：daily_g/);
});

test('unknown real moon never runs unscoped ETC moon select',async()=>{
  const db=mockDatabase();
  await assert.rejects(()=>readDraw(db.read)([{runeNumber:10,dir:2}],{
    staticTypes:['direction'],moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b'],currentMoon:'未知'
  }),/真實月相無法辨識/);
  assert.equal(db.queries.filter(q=>q.table==='silver.runes_etc').length,1);
});

test('special 65-66: only existing canonical daily texts, never invent missing entries',async()=>{
  const db=mockDatabase({special:true});
  const [card]=await readDraw(db.read)([{runeNumber:65,dir:1}],{
    staticTypes:['direction'],moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b'],currentMoon:'滿月'
  });
  assert.deepEqual(dailySections(card,'正位').map(x=>x.label),['狀況形容','狀況表達']);
});

console.log('[rune-draw-reads] real current code: 1-11 verse, single domains, daily 5, no OR overfetch, missing-data detection tested');
