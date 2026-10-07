/**
 * LunaRunes boardgame.io rules adapter.
 * Pure rules: no LOC components, CSS, navigation or database writes.
 * Supabase game rows are loaded before constructing the match.
 */
const shuffle=list=>{
  const next=[...(list||[])];
  for(let i=next.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [next[i],next[j]]=[next[j],next[i]];
  }
  return next;
};
const draw=(player,count,config)=>{
  const room=Math.max(0,config.handTempCap-player.hand.length);
  const n=Math.min(count,room,player.deck.length);
  return {...player,hand:[...player.hand,...player.deck.slice(0,n)],deck:player.deck.slice(n)};
};
const freshPlayer=(cards,name,config)=>{
  const deck=shuffle(cards);
  return {name,de:config.deMin,deck:deck.slice(config.openingDraw),hand:deck.slice(0,config.openingDraw),discard:[],selected:[],opening:true};
};
const finishOpening=(player,ids,config)=>{
  if(ids.length!==config.openingDiscard)throw new Error('起手棄牌數量不正確。');
  const selected=new Set(ids);
  if(selected.size!==config.openingDiscard)throw new Error('起手棄牌不可重複。');
  const discarded=player.hand.filter(card=>selected.has(card.id));
  if(discarded.length!==config.openingDiscard)throw new Error('起手棄牌不合法。');
  return {...player,hand:player.hand.filter(card=>!selected.has(card.id)),discard:[...player.discard,...discarded],selected:[],opening:false};
};
const applyDe=(player,delta,config)=>({...player,de:Math.max(config.deMin,Math.min(config.deMax,player.de+delta))});
const evaluateAlphaEvent=(cards,event,resultByCoverage,config)=>{
  if(cards.length!==config.eventResponseCards)throw new Error('Event 回應張數不正確。');
  const pool=[...(event?.req||[])];
  let macroHits=0;
  for(const card of cards){
    const index=pool.indexOf(card.alphaCompatMacro);
    if(index>=0){macroHits++;pool.splice(index,1);}
  }
  const diversity=new Set(cards.map(card=>card.group)).size;
  const coverage=Math.min(4,macroHits+Math.min(2,diversity));
  const result=resultByCoverage.get(coverage);
  if(!result)throw new Error('silver.game 缺少 Event Result：'+coverage+'/4');
  return {coverage,result:result.code,label:result.label,coverageText:result.coverageText,delta:result.delta,drawCount:result.drawCount};
};

const LABELS=['A','B','C','D'];
const snapshot=(players,step)=>Object.fromEntries([['step',step],...players.map((p,i)=>[LABELS[i],p.de])]);
const phaseAt=(rules,round)=>rules.rounds.find(row=>row.round===round)?.phase||'event';
const participants=G=>G.stage==='duel'?G.duelists:G.players.map((_,i)=>i);
const nextStage=(G,rules)=>{
  if(G.round===rules.rounds.length){
    const best=Math.max(...G.players.map(p=>p.de));
    const winners=G.players.map((p,i)=>p.de===best?i:-1).filter(i=>i>=0);
    if(winners.length===1){G.winner=winners[0];G.stage='finished';return;}
    G.round++;G.duelists=winners;G.active=winners[0];G.actions=0;G.stage='duel';
    G.result='平分，進入第 9 回合決鬥';return;
  }
  G.round++;G.stage=phaseAt(rules,G.round);G.active=0;G.actions=0;
  if(G.stage==='event')G.eventIndex++;
};
const finished=G=>G.stage==='finished'||G.winner!==null||G.draw;

export function createLunaRunesGame(rules,count){
  if(!rules?.cards?.length||!rules?.events?.length)throw new Error('LunaRunes 遊戲資料未就緒');
  if(count<rules.config.playerMin||count>rules.config.playerMax)throw new Error('玩家人數不合法');
  return {
    name:'lunarunes',
    setup:()=> {
      const players=Array.from({length:count},(_,i)=>freshPlayer(rules.cards,'玩家 '+LABELS[i],rules.config));
      return {
        players,eventDeck:shuffle(rules.events),eventIndex:0,round:1,
        stage:'opening',active:0,actions:0,winner:null,draw:false,
        duelists:[],cooperations:[],lastInteraction:null,
        history:[snapshot(players,'開始')],logs:['新遊戲開始。'],
        result:'每位玩家先選 '+rules.config.openingDiscard+' 張棄牌。'
      };
    },
    moves:{
      toggleCard({G},pi,id){
        if(finished(G)||!Number.isInteger(pi)||pi<0||pi>=G.players.length)return;
        const p=G.players[pi];
        if(G.stage==='opening'&&(pi!==G.active||!p.opening))return;
        if(G.stage!=='opening'&&G.stage!=='event')return;
        if(G.stage==='event'&&p.opening)return;
        const limit=G.stage==='opening'?rules.config.openingDiscard:rules.config.eventResponseCards;
        if(!p.hand.some(card=>card.id===id))return;
        p.selected=p.selected.includes(id)?p.selected.filter(x=>x!==id):
          p.selected.length<limit?[...p.selected,id]:p.selected;
      },
      confirmOpening({G},pi){
        if(G.stage!=='opening'||pi!==G.active)return;
        const p=G.players[pi];
        if(p.selected.length!==rules.config.openingDiscard){
          G.result='請選滿 '+rules.config.openingDiscard+' 張棄牌';return;
        }
        const next=finishOpening(p,p.selected,rules.config);
        G.players[pi]=next;
        const waiting=G.players.findIndex(player=>player.opening);
        if(waiting>=0){G.active=waiting;G.result=next.name+' 已完成起手';}
        else{G.stage=phaseAt(rules,1);G.active=0;G.result='進入第 1 回合';}
      },
      resolveEvent({G}){
        if(G.stage!=='event'||finished(G))return;
        if(G.players.some(p=>p.selected.length!==rules.config.eventResponseCards)){
          G.result='所有玩家均須選滿事件回應卡';return;
        }
        const event=G.eventDeck[G.eventIndex%G.eventDeck.length];
        const outcomes=G.players.map(p=>{
          const chosen=p.hand.filter(card=>p.selected.includes(card.id));
          const outcome=evaluateAlphaEvent(chosen,event,rules.resultByCoverage,rules.config);
          const updated=applyDe(p,outcome.delta,rules.config);
          updated.hand=updated.hand.filter(card=>!p.selected.includes(card.id));
          updated.discard=[...updated.discard,...chosen];updated.selected=[];
          return {player:draw(updated,outcome.drawCount,rules.config),outcome};
        });
        G.players=outcomes.map(x=>x.player);
        G.history.push(snapshot(G.players,'R'+G.round+' 事件'));
        G.result=outcomes.map((x,i)=>LABELS[i]+' '+x.outcome.label+' De '+x.outcome.delta).join('｜');
        G.logs.unshift('第 '+G.round+' 回合事件：'+G.result);
        nextStage(G,rules);
      },
      resonance({G},kind,targetIndex){
        if(!(G.stage==='resonance'||G.stage?.includes('resonance')||G.stage==='duel')||finished(G))return;
        const members=participants(G),actor=G.active;
        const target=kind==='self'?actor:targetIndex;
        if(!members.includes(actor)||!members.includes(target)||(kind!=='self'&&target===actor))return;
        if(kind!=='self'&&kind!=='attack')return;
        const delta=kind==='self'?rules.config.resonanceSelf:rules.config.resonanceAttack;
        G.players[target]=applyDe(G.players[target],delta,rules.config);
        G.lastInteraction={from:actor,to:target,type:kind};
        G.actions++;G.history.push(snapshot(G.players,'R'+G.round+' '+LABELS[actor]));
        G.logs.unshift('第 '+G.round+' 回合：'+LABELS[actor]+' '+kind+' '+LABELS[target]+' '+delta);
        G.active=members[G.actions%members.length];
        if(G.actions<members.length)return;
        if(G.stage==='duel'){
          const best=Math.max(...members.map(i=>G.players[i].de));
          const leaders=members.filter(i=>G.players[i].de===best);
          if(leaders.length===1)G.winner=leaders[0];else G.draw=true;
          G.stage='finished';return;
        }
        nextStage(G,rules);
      },
      toggleCooperation({G},target){
        if(!G.stage?.includes('resonance')||!Number.isInteger(target)||target===G.active||target<0||target>=G.players.length)return;
        const actor=G.active;
        const exists=G.cooperations.some(x=>(x.a===actor&&x.b===target)||(x.a===target&&x.b===actor));
        G.cooperations=exists?G.cooperations.filter(x=>!((x.a===actor&&x.b===target)||(x.a===target&&x.b===actor))):
          [...G.cooperations,{a:actor,b:target}];
        G.logs.unshift('第 '+G.round+' 回合合作：'+LABELS[actor]+' 與 '+LABELS[target]+' '+(exists?'解除':'建立'));
      }
    },
    endIf:({G})=>G.winner!==null?{winner:G.winner}:G.draw?{draw:true}:undefined
  };
}
