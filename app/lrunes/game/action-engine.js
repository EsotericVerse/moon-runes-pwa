import { applyDe, refillToFive } from './game-engine';
import { LEGACY_ACTION_PROFILE, MIGRATION_STATUS } from './legacy-action-profile';

function draw(player,count){const cards=player.deck.slice(0,count);return{...player,hand:[...player.hand,...cards],deck:player.deck.slice(cards.length)};}
function discardById(player,id){const card=player.hand.find(c=>c.id===id);if(!card)return player;return{...player,hand:player.hand.filter(c=>c.id!==id),discard:[...player.discard,card]};}
export function actionDescriptor(rune){return{runeId:rune.id,name:rune.name,canonAction:rune.action,legacyPrototype:LEGACY_ACTION_PROFILE[rune.id]||null,migration:MIGRATION_STATUS.requires_dual_card_adapter.includes(rune.id)?'needs-dual-card-adapter':'portable-prototype'};}

// Safe first migration slice: actions whose historical behavior can be represented
// without inventing a new dual-card coverage rule. Unsupported actions remain explicit
// prototypes instead of silently receiving guessed mechanics.
export function applyPortableRuneAction(game,actorIndex,runeId,options={}){
 const round=game.stage==='tiebreak'?9:(game.roundIndex+1),opponent=1-actorIndex;let players=[...game.players],note='';
 const self=()=>players[actorIndex],opp=()=>players[opponent];const setSelf=p=>{players[actorIndex]=p};const setOpp=p=>{players[opponent]=p};
 switch(runeId){
  case 4:{const id=options.retrieveId,card=self().discard.find(c=>c.id===id);if(!card)throw new Error('憶：請選擇自己的棄牌。');let p={...self(),discard:self().discard.filter(c=>c.id!==id),hand:[...self().hand,card]};if(options.discardId)p=discardById(p,options.discardId);setSelf(p);note='取回棄牌並交換手牌。';break;}
  case 8:setSelf(applyDe(self(),self().de>=12?3:1,round));note='依目前 De 強化推進。';break;
  case 20:{const ids=(options.discardIds||[]).slice(0,5);let p=self();ids.forEach(id=>{p=discardById(p,id)});p=draw(p,ids.length);p=applyDe(p,Math.min(3,ids.length),round);setSelf(p);note='棄牌、補牌並推進 De。';break;}
  case 21:setSelf(applyDe(self(),self().de<opp().de?2:1,round));note='落後時獲得較強推進。';break;
  case 31:setSelf(applyDe(self(),self().de>=10?4:2,round));note='依目前 De 結算成果。';break;
  case 33:if(options.mode==='attack'){setOpp(applyDe(opp(),-2,round));if(options.discardId)setSelf(discardById(self(),options.discardId));note='對手 -2，自己棄 1。';}else{setSelf(applyDe(self(),2,round));note='自己 +2。';}break;
  case 39:{const top=self().deck.slice(0,5),ids=new Set((options.keepIds||[]).slice(0,2));const keep=top.filter(c=>ids.has(c.id));if(keep.length!==2)throw new Error('礦：從牌庫頂 5 張選 2 張。');setSelf({...self(),hand:[...self().hand,...keep],deck:[...top.filter(c=>!ids.has(c.id)),...self().deck.slice(5)]});note='檢視礦脈並取 2 張。';break;}
  case 41:setSelf(applyDe(self(),2,round));note='光：基礎推進 +2；Event 額外條件待雙卡 adapter。';break;
  case 42:if(options.mode==='both'&&self().de>=12){setSelf(applyDe(self(),2,round));setOpp(applyDe(opp(),-2,round));note='暗：高 De 時雙向作用。';}else if(options.mode==='attack'){setOpp(applyDe(opp(),-2,round));note='暗：對手 -2。';}else{setSelf(applyDe(self(),2,round));note='暗：自己 +2。';}break;
  case 44:setOpp(applyDe(opp(),-2,round));setSelf(applyDe(self(),1,round));if(options.discardId)setSelf(discardById(self(),options.discardId));note='火：對手 -2、自己 +1 並棄牌。';break;
  case 47:{let p=applyDe(opp(),-3,round);const zero=p.de===0;setOpp(p);if(zero)setSelf(applyDe(self(),2,round));note='雷：對手 -3；歸零時自己 +2。';break;}
  case 53:setSelf(applyDe(self(),game.stage==='tiebreak'||[2,5,7].includes(game.roundIndex)?2:1,round));note='明：RP 中 +2；其他階段的抽棄牌效果另行處理。';break;
  case 57:setSelf(applyDe(self(),self().de<=opp().de?3:1,round));note='福：依雙方 De 關係推進。';break;
  case 58:setOpp(applyDe(opp(),opp().de>=12?-4:-3,round));note='禍：依對手 De 造成下降。';break;
  case 59:{const roll=Math.floor(Math.random()*6)+1;if(roll<=2)setSelf(applyDe(self(),4,round));else if(roll<=4)setSelf(applyDe(self(),2,round));else if(roll===5)setSelf({...self(),de:0,star:false,starSince:null});else setOpp({...opp(),de:0,star:false,starSince:null});note=`無：d6=${roll}`;break;}
  case 64:setSelf(applyDe(self(),round===8?4:2,round));note='果：R8 +4，其他 +2。';break;
  default:throw new Error(`${runeId} 的歷史 Action 需要額外 target/state 或雙卡 adapter；目前保留 prototype，不猜規則。`);
 }
 return{...game,players,log:[...game.log,{round,type:'rune-action',actor:actorIndex,rune:runeId,note}]};
}
