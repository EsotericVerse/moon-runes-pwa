const EVENTS=[{"id":"E01","name":"記憶","req":["SL","SL"],"desc":"過去重新浮現。"},{"id":"E02","name":"自我懷疑","req":["SL","OC"],"desc":"你開始質疑自己的定義。"},{"id":"E03","name":"真實表達","req":["SL","ML"],"desc":"必須說出真正的想法。"},{"id":"E04","name":"內在映照","req":["SL","NE"],"desc":"環境反映出你的狀態。"},{"id":"E05","name":"誤解","req":["SL","ML"],"desc":"訊息產生偏差。"},{"id":"E06","name":"合作","req":["ML","ML"],"desc":"單獨完成變得困難。"},{"id":"E07","name":"切斷","req":["ML","OC"],"desc":"某條連結必須結束。"},{"id":"E08","name":"重建關係","req":["ML","NE"],"desc":"關係進入新階段。"},{"id":"E09","name":"疾病","req":["SL","NE"],"desc":"系統需要修復。"},{"id":"E10","name":"康復","req":["SL","ML"],"desc":"開始回到正常軌道。"},{"id":"E11","name":"愛","req":["SL","OC"],"desc":"接受某種無法控制的情感。"},{"id":"E12","name":"韻律","req":["SL","NE","ML"],"desc":"找回自己的節奏。"},{"id":"E13","name":"發芽","req":["NE","NE"],"desc":"成長開始。"},{"id":"E14","name":"修剪","req":["NE","ML"],"desc":"去除不必要部分。"},{"id":"E15","name":"等待","req":["NE","OC"],"desc":"時機尚未成熟。"},{"id":"E16","name":"豐收","req":["NE","ML","OC"],"desc":"長期累積開始回收。"},{"id":"E17","name":"建立基礎","req":["ML","ML"],"desc":"穩定優先。"},{"id":"E18","name":"資源不足","req":["ML","NE"],"desc":"必須重新分配。"},{"id":"E19","name":"重建","req":["ML","OC"],"desc":"舊結構失效。"},{"id":"E20","name":"結晶","req":["ML","SL","OC"],"desc":"經驗開始固化。"},{"id":"E21","name":"火花","req":["NE","OC"],"desc":"新變化出現。"},{"id":"E22","name":"風向改變","req":["NE","ML"],"desc":"環境開始轉向。"},{"id":"E23","name":"洪流","req":["NE","NE","OC"],"desc":"變化超出預期。"},{"id":"E24","name":"平衡","req":["NE","SL","ML"],"desc":"多種力量需要協調。"},{"id":"E25","name":"選擇","req":["OC","ML"],"desc":"必須取捨。"},{"id":"E26","name":"時機","req":["OC","NE"],"desc":"不是不能做，而是何時做。"},{"id":"E27","name":"規則","req":["OC","ML","SL"],"desc":"建立新的邊界。"},{"id":"E28","name":"定錨","req":["OC","OC"],"desc":"做出不可逆決定。"},{"id":"E29","name":"偶然","req":["OC","NE"],"desc":"預期外事件發生。"},{"id":"E30","name":"幻象","req":["OC","SL"],"desc":"真假難辨。"},{"id":"E31","name":"空窗","req":["OC","ML"],"desc":"沒有明顯答案。"},{"id":"E32","name":"未知來信","req":["SL","ML","NE","OC"],"desc":"世界要求全面回應。"}];

const aspectOf=g=>({"靈魂":"SL","生命":"SL","連結":"ML","礦物":"ML","自然":"NE","元素":"NE","秩序":"OC","無序":"OC"}[g]||"OC");
let cards=[];

async function ensureCards(){
  if(cards.length) return;
  const res=await fetch("data/json/core/runes64.json");
  if(!res.ok) throw new Error("Rune JSON unavailable");
  const payload=await res.json();
  const items=Array.isArray(payload)?payload:(Array.isArray(payload?.runes)?payload.runes:[]);
  cards=items
    .filter(r=>Number(r["編號"])>=1&&Number(r["編號"])<=64)
    .map(r=>({id:r["編號"],name:r["名稱"]||r["符文名稱"],group:r["所屬分組"],aspect:aspectOf(r["所屬分組"])}));
}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let state=null;
const $=id=>document.getElementById(id);
function log(t){$("log").insertAdjacentHTML("afterbegin",`<p>${t}</p>`)}

async function newGame(){
 await ensureCards();
 state={players:[0,1].map(()=>({de:0,deck:shuffle(cards),hand:[],selected:[],acted:false})),eventDeck:shuffle(EVENTS),event:null,turn:0,resolved:[false,false],winner:null};
 state.players.forEach(p=>drawToFive(p)); nextEvent(true); log("<strong>新遊戲開始。</strong>"); render();
}
function drawToFive(p){while(p.hand.length<5&&p.deck.length)p.hand.push(p.deck.pop())}
function nextEvent(first=false){
 if(!state)return;
 state.event=state.eventDeck.pop()||shuffle(EVENTS)[0]; state.resolved=[false,false]; state.players.forEach(p=>{p.selected=[];p.acted=false;drawToFive(p)}); state.turn=0;
 $("newEvent").disabled=true; $("submit").disabled=false; log(`${first?"第一":"下一"}事件：<strong>${state.event.id} ${state.event.name}</strong>`); render();
}
function coverage(selected,req){
 const pool=selected.map(c=>c.aspect), need=[...req]; let hits=0;
 need.forEach(x=>{const i=pool.indexOf(x);if(i>=0){hits++;pool.splice(i,1)}});
 return {hits,total:need.length};
}
function deltaFor(h,t){
 const ratio=t? h/t:0;
 if(ratio===1)return {label:"完美",delta:2};
 if(ratio>=.75)return {label:"成功",delta:1};
 if(ratio>=.5)return {label:"普通",delta:0};
 if(ratio>0)return {label:"補牌",delta:0};
 return {label:"失敗",delta:-2};
}
function submit(){
 const p=state.players[state.turn]; if(p.selected.length!==3)return;
 const chosen=p.selected.map(i=>p.hand[i]); const cv=coverage(chosen,state.event.req), d=deltaFor(cv.hits,cv.total);
 p.de=Math.max(0,p.de+d.delta); const names=chosen.map(c=>c.name+"("+c.aspect+")").join("、");
 [...p.selected].sort((a,b)=>b-a).forEach(i=>p.hand.splice(i,1)); p.selected=[]; drawToFive(p); state.resolved[state.turn]=true;
 $("result").textContent=`Player ${state.turn?"B":"A"}：${d.label}，覆蓋 ${cv.hits}/${cv.total}，De ${d.delta>=0?"+":""}${d.delta}`;
 log(`Player ${state.turn?"B":"A"} 出牌：${names} → <strong>${d.label}</strong>（${cv.hits}/${cv.total}）`);
 checkWin();
 if(!state.winner){state.turn=state.turn?0:1; if(state.resolved.every(Boolean)) $("newEvent").disabled=false}
 render();
}
function interaction(kind){
 if(!state||state.winner)return; const p=state.players[state.turn]; if(!state.resolved[state.turn]||p.acted)return;
 if(kind==="resonate"){p.de+=1;log(`Player ${state.turn?"B":"A"} 自我共振：De +1`)}
 else{const o=state.players[state.turn?0:1];o.de=Math.max(0,o.de-2);log(`Player ${state.turn?"B":"A"} 破壞性共振：對手 De −2`)}
 p.acted=true;checkWin();render();
}
function checkWin(){
 const w=state.players.findIndex(p=>p.de>=16);
 if(w>=0){state.winner=w;$("status").textContent=`Player ${w?"B":"A"} 已達 16 De，取得本 Alpha 對局勝利。`;log(`<strong>Player ${w?"B":"A"} 勝利。</strong>`)}
}
function toggle(i){
 if(!state||state.winner||state.resolved[state.turn])return;const p=state.players[state.turn],x=p.selected.indexOf(i);
 if(x>=0)p.selected.splice(x,1);else if(p.selected.length<3)p.selected.push(i);render();
}
function renderHand(pi){
 const p=state.players[pi],el=$("hand"+pi);el.innerHTML="";
 p.hand.forEach((c,i)=>{const b=document.createElement("button");b.className="rune"+(p.selected.includes(i)?" selected":"");b.disabled=state.turn!==pi||state.resolved[pi]||!!state.winner;b.innerHTML=`<b>${c.name}</b><span class="muted">${c.group}</span><br><span class="tag">${c.aspect}</span>`;b.onclick=()=>toggle(i);el.appendChild(b)});
 $("score"+pi).textContent=p.de;$("deck"+pi).textContent=p.deck.length;$("p"+pi).classList.toggle("turn",state.turn===pi&&!state.winner);
}
function render(){
 if(!state)return;renderHand(0);renderHand(1);$("eventId").textContent=state.event.id;$("eventName").textContent=state.event.name;$("eventReq").textContent=state.event.req.join(" + ");$("eventDesc").textContent=state.event.desc;
 const p=state.players[state.turn];$("submit").disabled=!!state.winner||state.resolved[state.turn]||p.selected.length!==3;
 $("resonate").disabled=!!state.winner||!state.resolved[state.turn]||p.acted;$("disrupt").disabled=$("resonate").disabled;
 if(!state.winner)$("status").textContent=`目前：Player ${state.turn?"B":"A"}。請選三張符文回答事件。`;
}
$("newGame").onclick=newGame;$("newEvent").onclick=()=>nextEvent();$("submit").onclick=submit;$("resonate").onclick=()=>interaction("resonate");$("disrupt").onclick=()=>interaction("disrupt");
