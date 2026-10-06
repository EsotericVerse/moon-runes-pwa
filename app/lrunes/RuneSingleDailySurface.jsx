'use client';

import RuneCardInfo from './RuneCardInfo';
import {runeImage} from './rune-directory.mjs';
import RuneDrawModeBubbles from './RuneDrawModeBubbles';

const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];

function directionNo(direction){
  return ['正位','半正位','半逆位','逆位'].indexOf(direction)+1;
}
function runeEtcText(card,type,direction){
  return String(card?.rune_etc?.[type]?.[directionNo(direction)]||'').trim();
}
function directionText(card,direction){
  return runeEtcText(card,'direction',direction)||String(card?.rune_description||'').trim();
}
function lotSections(card,direction){
  const text=String(card?.rune_etc?.lots?.[directionNo(direction)]||'').trim();
  if(!text)return [];
  return ['愛情','事業','關係','健康'].map(label=>{
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {label,text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')||'資訊不足'};
  });
}
function dailySections(card,direction){
  const rows=[
    ['sit_q','狀況形容'],
    ['sit_a','狀況表達'],
    ['daily_r','每日占卜提醒'],
    ['daily_g','每日占卜引導'],
    ['daily_b','每日占卜祝福']
  ].map(([type,label])=>({label,text:runeEtcText(card,type,direction)})).filter(item=>item.text);
  if(rows.length)return rows;
  const fallback=directionText(card,direction);
  return [{label:'今日指引',text:fallback||'目前沒有這個位向與月相的每日指示。'}];
}

export default function RuneSingleDailySurface({
  modeKey,
  selectedMode,
  draw,
  ritualStep,
  ritualMessage,
  moonPhase,
  error,
  ritualCard,
  onRetry
}){
  const isDaily=modeKey==='daily';
  const drawnCard=draw?.cards?.[0]||null;
  const displayCard=drawnCard||ritualCard||{rune_id:65,rune_name:'玄'};
  const displayDirection=drawnCard?draw?.directions?.[0]||'':'';
  const displayName=drawnCard
    ?[drawnCard.rune_name,drawnCard.english_name?`(${drawnCard.english_name})`:''].filter(Boolean).join(' ')
    :'';
  const directionIndex=drawnCard?Number(draw?.directionIndexes?.[0]??0):0;
  const waiting=ritualStep>=0;
  const dailyItems=drawnCard&&isDaily?dailySections(drawnCard,displayDirection):[];
  const singleItems=drawnCard&&!isDaily?lotSections(drawnCard,displayDirection):[];

  return <>
    <section className="loc-card runes-single-daily-stage" id="draw" data-draw-mode={modeKey}>
      <div className="home-rune-layout">
        <RuneCardInfo
          card={displayCard}
          imageSrc={runeImage(displayCard)}
          imageClassName={`loc-rune-card-image ${drawnCard?ROTATION_CLASSES[directionIndex]:'rune-rotate-0'}`}
          direction={displayDirection}
          realMoonPhase={moonPhase}
          layout="home"
        />

        <div className="home-rune-copy home-rune-copy-plain">
          {waiting?<>
            <p className="loc-eyebrow">等待片刻</p>
            <h2>{ritualMessage}</h2>
            <p>{selectedMode.label}抽牌進行中。</p>
            <p>真實月相：{moonPhase}</p>
          </>:null}

          {!waiting&&error?<p className="loc-status error">{error}</p>:null}

          {!waiting&&drawnCard&&!isDaily?<>
            <p className="loc-eyebrow">單卡籤詩</p>
            <h2>{displayName} · {displayDirection}</h2>
            <p className="runes-reading-lead">
              <strong>占卜結論｜{displayName}・{displayDirection}</strong>
              <span>位向基句：{directionText(drawnCard,displayDirection)||'目前沒有這個位向的符文說明。'}</span>
              {runeEtcText(drawnCard,'sit_q',displayDirection)?<span>狀況形容：{runeEtcText(drawnCard,'sit_q',displayDirection)}</span>:null}
              {runeEtcText(drawnCard,'sit_a',displayDirection)?<span>狀況表達：{runeEtcText(drawnCard,'sit_a',displayDirection)}</span>:null}
            </p>
            <div className="home-draw-bubbles" aria-label="單卡籤詩分析">
              {singleItems.map(item=><div className="loc-bubble" key={item.label}><strong>{item.label}</strong><p>{item.text}</p></div>)}
            </div>
          </>:null}

          {!waiting&&drawnCard&&isDaily?<>
            <p className="loc-eyebrow">每日指示</p>
            <h2>{displayName} · {displayDirection}</h2>
            <div className="home-draw-bubbles" aria-label="每日符文建議">
              {dailyItems.map((item,index)=><div className="loc-bubble" key={item.label+'-'+index}>
                {item.label?<strong>{item.label}</strong>:null}
                <p>{item.text}</p>
              </div>)}
            </div>
          </>:null}

          {!waiting&&!drawnCard&&!error?<>
            <p className="loc-eyebrow">{selectedMode.label}抽牌</p>
            <h2>{selectedMode.description}</h2>
          </>:null}

          {!waiting&&drawnCard?<div className="loc-actions runes-retry">
            <button type="button" className="loc-button" onClick={onRetry}>再抽一次</button>
          </div>:null}
        </div>
      </div>
    </section>

    <section className="loc-card" data-draw-selection={modeKey}>
      <p className="loc-eyebrow">抽牌選擇</p>
      <h2>選擇抽牌方式</h2>
      <RuneDrawModeBubbles activeKey={modeKey}/>
    </section>
  </>;
}
