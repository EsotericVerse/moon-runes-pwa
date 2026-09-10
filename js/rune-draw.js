const DIRECTIONS = ['正位','半正位','半逆位','逆位'];
const ROTATIONS = ['rotate(0deg)','rotate(90deg)','rotate(-90deg)','rotate(180deg)'];
const DIRECTION_FIELDS = {
  '正位':'正向表示',
  '半正位':'半正向表示',
  '半逆位':'半逆向表示',
  '逆位':'逆向表示'
};

const MODE_CONFIG = {
  single:{title:'單卡',kicker:'LunaRunes · Single Rune',count:1,labels:['核心']},
  daily:{title:'每日',kicker:'LunaRunes · Daily Rune',count:1,labels:['今日']},
  '2card':{title:'雙卡 · 因 → 果',kicker:'LunaRunes · Two Cards',count:2,labels:['因','果']},
  '3card':{title:'三卡 · 源 → 轉 → 合',kicker:'LunaRunes · Three Cards',count:3,labels:['源','轉','合']},
  '5card':{title:'五卡',kicker:'LunaRunes · Five Cards',count:5,labels:['過去','現在','未來','外在','內在']},
  '11card':{title:'OW3gs · 11卡',kicker:'LunaRunes · OW3gs',count:11,labels:['1','2','3','4','5','6','7','8','9','10','11']}
};

let currentRunes = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

async function loadCurrentRunes(){
  if(currentRunes) return currentRunes;
  const response=await fetch('data/json/core/runes66.json',{cache:'no-store'});
  if(!response.ok) throw new Error(`runes66.json HTTP ${response.status}`);
  const rows=await response.json();
  if(!Array.isArray(rows)) throw new Error('Current runes66 schema must be a JSON array');
  currentRunes=rows
    .filter(row=>Number.isInteger(Number(row.編號))&&Number(row.編號)>=1&&Number(row.編號)<=66)
    .map(row=>({
      編號:Number(row.編號),
      符文名稱:row.符文名稱??'',
      英文:row.英文??'',
      所屬分組:row.所屬分組??'',
      月相:row.月相??'無',
      卡片屬性:row.卡片屬性??'',
      關鍵詞:row.關鍵詞??'',
      正向表示:row.正向表示??'',
      半正向表示:row.半正向表示??'',
      半逆向表示:row.半逆向表示??'',
      逆向表示:row.逆向表示??''
    }));
  if(currentRunes.length!==66) throw new Error(`可抽取符文應為 66 枚，目前 ${currentRunes.length} 枚`);
  return currentRunes;
}

function normalizeMode(value){
  return MODE_CONFIG[value]?value:'single';
}

function shuffle(values){
  const copy=[...values];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

async function drawCards(count){
  const runes=await loadCurrentRunes();
  return shuffle(runes).slice(0,count).map(rune=>{
    const directionIndex=Math.floor(Math.random()*4);
    return {
      id:rune.編號,
      rune,
      direction:DIRECTIONS[directionIndex],
      directionIndex
    };
  });
}

function cardHtml(card,label,realPhase){
  const r=card.rune;
  const image=`${String(r.編號).padStart(2,'0')}_${r.符文名稱}.png`;
  return `
    <article class="rune-result-card" data-density="full">
      <span class="rune-result-position">${esc(label)}</span>
      <div class="rune-result-image">
        <img src="64images/${encodeURIComponent(image)}" alt="${esc(r.符文名稱)}之符文" style="transform:${ROTATIONS[card.directionIndex]}" />
      </div>
      <div class="rune-result-body">
        <span class="rune-result-english">${esc(r.英文)}</span>
        <h2 class="rune-result-name">${esc(r.符文名稱)}之符文</h2>
        <div class="rune-result-grid">
          <div class="rune-result-field"><span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(r.關鍵詞||'—')}</span></div>
          <div class="rune-result-field"><span class="rune-result-label">所屬分組</span><span class="rune-result-value">${esc(r.所屬分組||'—')}</span></div>
          <div class="rune-result-field"><span class="rune-result-label">卡片屬性</span><span class="rune-result-value">${esc(r.卡片屬性||'—')}</span></div>
          <div class="rune-result-field moon"><span class="rune-result-label">卡片月相</span><span class="rune-result-value">${esc(r.月相||'無')} / 真實月相：${esc(realPhase)}</span></div>
        </div>
        <div class="rune-result-direction"><strong>卡片方向：</strong>${esc(card.direction)}</div>
      </div>
    </article>`;
}

function saveDraw(mode,cards,realPhase){
  const payload={
    schema_version:'1.0',
    mode,
    real_moon_phase:realPhase,
    cards:cards.map((card,index)=>({
      position:index+1,
      id:card.id,
      rune:card.rune.符文名稱,
      english:card.rune.英文,
      direction:card.direction,
      keyword:card.rune.關鍵詞,
      group:card.rune.所屬分組,
      card_attribute:card.rune.卡片屬性,
      card_moon_phase:card.rune.月相,
      direction_text:card.rune[DIRECTION_FIELDS[card.direction]]||''
    }))
  };
  sessionStorage.setItem('LOC_LAST_RUNE_DRAW',JSON.stringify(payload));
}

function analysisLink(mode){
  const url=new URL('runes.html',location.href);
  url.hash='rag';
  url.searchParams.set('from','lots');
  url.searchParams.set('mode',mode);
  return url.pathname+url.search+url.hash;
}

async function ritual(mode){
  document.body.dataset.drawing='true';
  const message=document.getElementById('ritual-message');
  const lines=[
    `您目前使用的是「${MODE_CONFIG[mode].title}」抽牌。`,
    '正在抽取符文……',
    '正在決定卡片方向……',
    '正在整理牌面……',
    '抽牌完成。'
  ];
  const started=Date.now();
  for(let i=0;i<lines.length;i++){
    if(message) message.textContent=lines[i];
    const wait=Math.max(0,started+(i+1)*1000-Date.now());
    await new Promise(resolve=>setTimeout(resolve,wait));
  }
  document.body.dataset.drawing='false';
}

async function renderResult(mode,config,realPhase){
  const cards=await drawCards(config.count);
  const grid=document.getElementById('cards-grid');
  const reading=document.getElementById('reading');
  if(!grid||!reading) throw new Error('抽牌結果區不存在。');

  grid.dataset.count=String(config.count);
  grid.innerHTML=cards.map((card,index)=>cardHtml(card,config.labels[index],realPhase)).join('');
  saveDraw(mode,cards,realPhase);

  const resultRealPhase=document.getElementById('result-real-phase');
  if(resultRealPhase) resultRealPhase.textContent=`真實月相｜${realPhase}`;

  const fiveSchema=document.getElementById('five-card-schema');
  if(fiveSchema) fiveSchema.hidden=mode!=='5card';

  const coreNote=mode==='11card'
    ? 'OW3gs 以第 7–11 張作為核心判定區；Lots 只保存本次牌面，不在此頁做語意解析。'
    : 'Lots 只負責抽牌與固定牌面資料；占卜解析交由月之符文知識庫處理。';
  reading.innerHTML=`
    <div class="reading-lead"><strong>抽牌完成</strong>${esc(coreNote)}</div>
    <p><a class="download-btn" href="${esc(analysisLink(mode))}">前往符文知識庫解析本次牌面</a></p>`;

  const modeNote=document.getElementById('mode-note');
  if(modeNote) modeNote.textContent='牌面已儲存在本次瀏覽 session，可交給 Runes RAG 解析。';

  const ritualView=document.getElementById('ritual-view');
  const resultView=document.getElementById('result-view');
  if(ritualView) ritualView.hidden=true;
  if(resultView) resultView.hidden=false;
}

async function executeDraw(mode,config,realPhase){
  const panel=document.getElementById('draw-result-panel');
  const ritualView=document.getElementById('ritual-view');
  const resultView=document.getElementById('result-view');
  if(!panel) throw new Error('抽牌執行區不存在。');

  panel.hidden=false;
  if(resultView) resultView.hidden=true;
  if(ritualView) ritualView.hidden=false;

  const modeTitle=document.getElementById('mode-title');
  const modeKicker=document.getElementById('mode-kicker');
  if(modeTitle) modeTitle.textContent=config.title;
  if(modeKicker) modeKicker.textContent=config.kicker;

  const ritualPhase=document.getElementById('ritual-phase');
  if(ritualPhase) ritualPhase.textContent=`卡片月相：無 / 真實月相：${realPhase}`;

  panel.scrollIntoView({behavior:'smooth',block:'start'});
  await Promise.all([ritual(mode),loadCurrentRunes()]);
  await renderResult(mode,config,realPhase);
}

function showDrawError(error){
  console.error('Rune draw failed',error);
  document.body.dataset.drawing='false';
  const panel=document.getElementById('draw-result-panel');
  const ritualView=document.getElementById('ritual-view');
  const resultView=document.getElementById('result-view');
  const reading=document.getElementById('reading');
  if(panel) panel.hidden=false;
  if(ritualView) ritualView.hidden=true;
  if(resultView) resultView.hidden=false;
  if(reading) reading.innerHTML=`<div class="reading-lead"><strong>抽牌暫時無法完成</strong>${esc(error?.message||'請重新整理頁面後再試。')}</div>`;
}

async function startDraw(modeValue,updateUrl=false){
  const mode=normalizeMode(modeValue);
  const config=MODE_CONFIG[mode];
  const realPhase=window.LOCMoonPhase?.getRealPhase?.()||'未知';
  sessionStorage.setItem('realPhase',realPhase);

  const selector=document.getElementById('draw-mode-selector');
  if(selector) selector.hidden=true;

  if(updateUrl){
    const url=new URL(location.href);
    url.searchParams.set('mode',mode);
    url.hash='draw';
    history.replaceState(null,'',url);
  }

  try{await executeDraw(mode,config,realPhase)}catch(error){showDrawError(error)}
}

function initRuneDraw(){
  document.querySelectorAll('a.draw-mode-card[href*="mode="]').forEach(link=>{
    link.addEventListener('click',event=>{
      event.preventDefault();
      const url=new URL(link.href,location.href);
      startDraw(url.searchParams.get('mode'),true);
    });
  });
  const requestedMode=new URLSearchParams(location.search).get('mode');
  if(requestedMode) startDraw(requestedMode,false);
}

if(document.readyState==='loading'){
  window.addEventListener('DOMContentLoaded',initRuneDraw,{once:true});
}else{
  initRuneDraw();
}
