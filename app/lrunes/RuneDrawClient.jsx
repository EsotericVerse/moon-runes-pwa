'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {runeImage} from './rune-directory.mjs';
import {selectRows} from '../loc/db-query.mjs';
import {useSetting} from '../loc/use-setting';
import {realMoonPhase} from '../loc/model/moon-phase';
import {scopeHref} from '../modular/scope-registry';
import RuneCardInfo from './RuneCardInfo';
import RuneSingleDailySurface from './RuneSingleDailySurface';
import {RUNE_RITUAL_DELAY_MS,RUNE_RITUAL_STEP_MS,runeRitualMessages} from './rune-ritual';
import {RUNE_ALL_DRAW_MODES,RUNE_DRAW_MODES} from './rune-draw-modes.mjs';
import {buildSpreadAdvice} from './rune-guidance-engine.mjs';

const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];
const RUNE_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,positive_keywords,negative_keywords,extra_rules,extra_notes';

function randomIndex(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do globalThis.crypto.getRandomValues(value);while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}

function drawRuneSession(items,count){
  if(!Number.isInteger(count)||count<0||count>items.length)throw new Error(`無效的抽牌數量：${count}`);
  const pool=[...items],cards=[];
  for(let index=0;index<count;index+=1){
    const pick=randomIndex(pool.length);
    cards.push(pool.splice(pick,1)[0]);
  }
  const directionIndexes=cards.map(()=>randomIndex(4));
  return {cards,directionIndexes,directions:directionIndexes.map(index=>RUNE_DIRECTIONS[index])};
}

function directionNo(direction){return RUNE_DIRECTIONS.indexOf(direction)+1;}

async function loadDrawCards(pairs,{staticTypes=[],moonTypes=[],currentMoon=''}) {
  const ids=[...new Set(pairs.map(item=>Number(item.runeNumber)))];
  const pairFilter=pairs.map(item=>`and(rune_id.eq.${Number(item.runeNumber)},dir.eq.${Number(item.dir)})`).join(',');
  const staticPromise=staticTypes.length?selectRows('silver.runes_etc',{
    columns:'rune_id,dir,type,current_moon,desc',
    filters:[{column:'type',operator:'in',value:staticTypes}],
    orFilter:pairFilter,
    limit:Math.max(1,pairs.length*staticTypes.length),
    offset:0
  }):Promise.resolve({rows:[]});
  const moonPromise=moonTypes.length&&currentMoon&&currentMoon!=='未知'?selectRows('silver.runes_etc',{
    columns:'rune_id,dir,type,current_moon,desc',
    filters:[
      {column:'type',operator:'in',value:moonTypes},
      {column:'current_moon',operator:'eq',value:currentMoon}
    ],
    orFilter:pairFilter,
    limit:Math.max(1,pairs.length*moonTypes.length),
    offset:0
  }):Promise.resolve({rows:[]});
  const [runeResult,staticResult,moonResult]=await Promise.all([
    selectRows('silver.runes',{
      columns:RUNE_COLUMNS,
      filters:[{column:'rune_id',operator:'in',value:ids}],
      limit:ids.length,
      offset:0
    }),
    staticPromise,
    moonPromise
  ]);
  const map=new Map((runeResult.rows||[]).map(row=>[Number(row.rune_id),{...row,rune_etc:{}}]));
  for(const row of [...(staticResult.rows||[]),...(moonResult.rows||[])]){
    const rune=map.get(Number(row.rune_id));
    if(!rune)continue;
    rune.rune_etc[row.type]??={};
    rune.rune_etc[row.type][Number(row.dir)]=String(row.desc||'');
  }
  return [...map.values()];
}

async function loadRuneCard(runeId){
  const result=await selectRows('silver.runes',{
    columns:RUNE_COLUMNS,
    filters:[{column:'rune_id',operator:'eq',value:Number(runeId)}],
    limit:1,
    offset:0
  });
  return result.rows?.[0]||null;
}

function runeEtcText(card,type,direction){
  return String(card?.rune_etc?.[type]?.[directionNo(direction)]||'').trim();
}

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual'};

function runeDisplayName(card){
  const chinese=String(card?.rune_name||'').trim();
  const english=String(card?.english_name||'').trim();
  return english?`${chinese} (${english})`:chinese;
}

function directionText(card,direction){
  return runeEtcText(card,'direction',direction)||String(card?.rune_description||'').trim();
}
function situationQuestion(card,direction){
  return runeEtcText(card,'sit_q',direction);
}
function situationAnswer(card,direction){
  return runeEtcText(card,'sit_a',direction)||directionText(card,direction);
}
function situationDetail(card,direction){
  const question=situationQuestion(card,direction);
  const answer=situationAnswer(card,direction);
  if(question&&answer)return `狀況形容：${question}｜狀況表達：${answer}`;
  return answer||question||'資訊不足';
}


function cleanGrammarPart(value){
  return String(value||'').trim().replace(/[。；;，,\s]+$/g,'')||'資訊不足';
}

function drawSegments(mode){
  const spec=RUNE_ALL_DRAW_MODES.find(item=>item.key===mode);
  return Array.isArray(spec?.segments)?spec.segments:[];
}

function joinPoeticGroup(values=[]){
  const parts=values.map(cleanGrammarPart).filter(Boolean);
  if(parts.length<=1)return parts[0]||'資訊不足';
  return parts.join('，');
}

function trendConnector(trend){
  if(trend==='轉強')return '遂';
  if(trend==='轉弱')return '然';
  return '而';
}

function composeFixedGrammar(values,mode,trend='持平'){
  const parts=(values||[]).map(cleanGrammarPart);
  if(mode==='ow3gs'&&parts.length>=11){
    const cause=`${joinPoeticGroup(parts.slice(0,2))}；${joinPoeticGroup(parts.slice(2,4))}，遂${joinPoeticGroup(parts.slice(4,6))}`;
    const result=`${joinPoeticGroup(parts.slice(6,8))}；${parts[8]}，遂${joinPoeticGroup(parts.slice(9,11))}`;
    return `${cause}；${result}。`;
  }
  const segments=drawSegments(mode);
  if(segments.length){
    const groups=[];
    let offset=0;
    for(const size of segments){
      groups.push(joinPoeticGroup(parts.slice(offset,offset+size)));
      offset+=size;
    }
    if(groups.length===2)return `${groups[0]}，故${groups[1]}。`;
    if(groups.length===3)return `${groups[0]}；${groups[1]}，${trendConnector(trend)}${groups[2]}。`;
    return `${groups.join('；')}。`;
  }
  if(parts.length===1)return `${parts[0]}。`;
  return parts.length?`${parts.join('；')}。`:'資訊不足。';
}

function poeticClause(card,direction){
  return cleanGrammarPart(situationQuestion(card,direction));
}

function buildFixedReading(cards,directions,mode){
  const source=Array.isArray(cards)?cards:[];
  const poeticParts=source.map((card,index)=>poeticClause(card,directions[index]));
  const weighted=buildSpreadAdvice(source,directions,mode);
  const sentence=composeFixedGrammar(poeticParts,mode,weighted?.trend||'持平');
  return {sentence,domains:[],evaluation:weighted};
}

function DrawSelection({activeKey}){
  return <div className="runes-spread-selection" data-draw-selection={activeKey}>
    <p className="loc-eyebrow">抽牌選擇</p>
    <h3>選擇抽牌方式</h3>
    <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
      {RUNE_DRAW_MODES.map(item=><a
        key={item.key}
        className="loc-bubble"
        href={scopeHref('lrunes',item.path)}
        aria-current={item.key===activeKey?'page':undefined}
      >
        <strong>{item.label}</strong>
        <p>{item.description}</p>
      </a>)}
    </div>
  </div>;
}

function RuneCardAt({draw,index,selectedMode,moonPhase}){
  const card=draw.cards[index];
  if(!card)return null;
  return <RuneCardInfo
    key={`${card.rune_id}-${index}`}
    card={card}
    imageSrc={runeImage(card)}
    imageClassName={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`}
    positionLabel={selectedMode.positions[index]||`第 ${index+1} 張`}
    direction={draw.directions[index]}
    realMoonPhase={moonPhase}
    dataRuneId={card.rune_id}
    dataDrawPosition={selectedMode.positions[index]||index+1}
    layout="home"
  />;
}

function SpreadCards({draw,mode,selectedMode,moonPhase}){
  const card=index=><RuneCardAt draw={draw} index={index} selectedMode={selectedMode} moonPhase={moonPhase}/>;

  if(mode==='2card'){
    return <div className="runes-spread-row runes-spread-row-two">{card(0)}{card(1)}</div>;
  }
  if(mode==='3card'){
    return <div className="runes-spread-row runes-spread-row-three">{card(0)}{card(1)}{card(2)}</div>;
  }
  if(mode==='5card'){
    return <div className="runes-spread-cards">
      <div className="runes-spread-row runes-spread-row-three">{card(0)}{card(1)}{card(2)}</div>
      <div className="runes-spread-row runes-spread-row-two">{card(3)}{card(4)}</div>
    </div>;
  }
  if(mode==='ow3gs'){
    return <div className="runes-spread-cards runes-spread-ow3gs">
      <div className="runes-spread-row runes-spread-row-three runes-spread-stack-row">
        <div className="runes-spread-stack">{card(0)}{card(1)}</div>
        <div className="runes-spread-stack">{card(2)}{card(3)}</div>
        <div className="runes-spread-stack">{card(4)}{card(5)}</div>
      </div>
      <div className="runes-spread-row runes-spread-row-three runes-spread-stack-row">
        <div className="runes-spread-stack">{card(6)}{card(7)}</div>
        <div className="runes-spread-single-center">{card(8)}</div>
        <div className="runes-spread-stack">{card(9)}{card(10)}</div>
      </div>
    </div>;
  }
  const rows=Array.isArray(selectedMode?.displayRows)?selectedMode.displayRows:[];
  if(rows.length&&rows.reduce((sum,size)=>sum+size,0)===draw.cards.length){
    let offset=0;
    return <div className="runes-spread-cards" data-spread-rows={rows.join('-')}>
      {rows.map((size,rowIndex)=>{
        const indexes=Array.from({length:size},(_,index)=>offset+index);
        offset+=size;
        const rowClass=size===3?'runes-spread-row runes-spread-row-three':size===2?'runes-spread-row runes-spread-row-two':'runes-spread-row';
        return <div className={rowClass} key={`row-${rowIndex}-${size}`}>
          {size===1?<div className="runes-spread-single-center">{card(indexes[0])}</div>:indexes.map(index=>card(index))}
        </div>;
      })}
    </div>;
  }
  return null;
}

export default function RuneDrawClient({drawKey='single'}){
  const {value:uiSettings}=useSetting(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [error,setError]=useState('');
  const [draw,setDraw]=useState(null);
  const [ritualStep,setRitualStep]=useState(-1);
  const [ritualCard,setRitualCard]=useState(null);
  const timers=useRef([]);
  const autoStarted=useRef(false);

  const selectedMode=useMemo(()=>RUNE_ALL_DRAW_MODES.find(item=>item.key===drawKey)||RUNE_DRAW_MODES[0],[drawKey]);
  const instantDraw=uiSettings?.draw_response==='instant';
  const moonPhase=useMemo(()=>realMoonPhase(),[]);
  const ritualMessages=runeRitualMessages(drawKey);
  const singleDaily=drawKey==='single'||drawKey==='daily';

  async function finishDraw(){
    try{
      const runePool=Array.from({length:66},(_,index)=>index+1);
      const {cards:runeNumbers,directionIndexes,directions}=drawRuneSession(runePool,selectedMode.count);
      const pairs=runeNumbers.map((runeNumber,index)=>({runeNumber:Number(runeNumber),dir:Number(directionIndexes[index])+1}));
      const queryPlan=drawKey==='daily'
        ?{staticTypes:['direction'],moonTypes:['sit_q','sit_a','daily_r','daily_g','daily_b'],currentMoon:moonPhase}
        :drawKey==='single'
          ?{staticTypes:['direction','lots'],moonTypes:['sit_q','sit_a'],currentMoon:moonPhase}
          :{staticTypes:['direction'],moonTypes:['sit_q'],currentMoon:moonPhase};
      const rows=await loadDrawCards(pairs,queryPlan);
      const byNumber=new Map(rows.map(row=>[Number(row.rune_id),row]));
      const cards=runeNumbers.map(number=>byNumber.get(Number(number))).filter(Boolean);
      if(cards.length!==runeNumbers.length)throw new Error('抽中的符文資料不完整。');
      const reading=buildFixedReading(cards,directions,drawKey);
      const createdAt=new Date().toISOString();
      setDraw({id:`rune-draw:${drawKey}:${Date.now()}`,createdAt,cards,directionIndexes,directions,reading});
      setError('');
    }catch(err){
      setDraw(null);
      setError(`抽牌失敗：${err?.message||'未知錯誤'}`);
    }finally{
      setRitualStep(-1);
    }
  }

  function executeDraw(){
    if(ritualStep>=0)return;
    setError('');
    setDraw(null);
    timers.current.forEach(clearTimeout);
    timers.current=[];
    if(instantDraw){
      finishDraw();
      return;
    }
    setRitualStep(0);
    [1,2,3,4].forEach(step=>timers.current.push(setTimeout(()=>setRitualStep(step),step*RUNE_RITUAL_STEP_MS)));
    timers.current.push(setTimeout(finishDraw,RUNE_RITUAL_DELAY_MS));
  }

  useEffect(()=>{
    let live=true;
    loadRuneCard(65).then(card=>{if(live)setRitualCard(card);}).catch(()=>{});
    return()=>{live=false};
  },[]);

  useEffect(()=>{
    if(autoStarted.current)return;
    autoStarted.current=true;
    executeDraw();
  },[drawKey]);

  return <div className="runes-draw-surface">
    <section className="loc-view">
      <header className="loc-hero" id="intro">
        <p className="loc-eyebrow">月之符文</p>
        <h1>月之符文</h1>
        <p>月之符文由 66 枚核心符文組成。選擇抽牌方式後，系統會依符文、方向與固定組句規則產生籤詩；結果只供參考，你仍保有自己的判斷與選擇。</p>
      </header>

      {singleDaily?
        <RuneSingleDailySurface
          modeKey={drawKey}
          selectedMode={selectedMode}
          draw={draw}
          ritualStep={ritualStep}
          ritualMessage={ritualStep>=0?ritualMessages[ritualStep]:''}
          moonPhase={moonPhase}
          error={error}
          ritualCard={ritualCard}
          onRetry={executeDraw}
        />:
        <>
          {ritualStep>=0&&<section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={drawKey} aria-live="polite">
            <div className="runes-ritual-card">
              <img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/>
              <strong>玄之符文</strong>
            </div>
            <div className="runes-ritual-copy">
              <p className="loc-eyebrow">等待片刻</p>
              <h2>{ritualMessages[ritualStep]}</h2>
              <p>真實月相：{moonPhase}</p>
            </div>
          </section>}

          {draw&&<>
            <section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={drawKey}>
              <div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div>
              <SpreadCards draw={draw} mode={drawKey} selectedMode={selectedMode} moonPhase={moonPhase}/>
              <div className="loc-actions runes-retry">
                <button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button>
              </div>
            </section>

            <section className="loc-card runes-spread-verse" data-draw-stage="reading">
              <div data-draw-stage="lots">
                <p className="loc-eyebrow">籤詩</p>
                <h2>占卜結果</h2>
                <p>{draw.reading?.sentence||'資訊不足。'}</p>
              </div>
              <DrawSelection activeKey={drawKey}/>
            </section>
          </>}
        </>
      }
    </section>
  </div>;
}
