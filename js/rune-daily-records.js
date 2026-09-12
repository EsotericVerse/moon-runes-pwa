import { rune } from "./runes66.js";

const API = "https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec";
const REPO_HISTORY = "data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json";
const CACHE_KEY = "lunarunes-physical-daily-draw-cache-v3";
const $ = s => document.querySelector(s);
const PAGE_SIZE = 20;
let currentPage = 1;
let currentRows = [];

function esc(value="") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
}

function normalize(row={}) {
  return {
    id:String(row.id||""),
    date:String(row.date||""),
    draw_kind:String(row.draw_kind||"daily_draw"),
    rune_id:String(row.rune_id||""),
    rune:String(row.rune||""),
    direction:String(row.direction||""),
    note:String(row.note||"")
  };
}

function rowKey(row={}) {
  const x=normalize(row);
  return [x.date,x.draw_kind,x.rune,x.direction].join("|");
}

function mergeRows(...groups) {
  const map=new Map();
  for(const group of groups){
    for(const raw of Array.isArray(group)?group:[]){
      const row=normalize(raw);
      if(!row.date||!row.rune) continue;
      const key=rowKey(row);
      map.set(key,{...(map.get(key)||{}),...row});
    }
  }
  return [...map.values()];
}

function readCache() {
  try {
    const v=JSON.parse(localStorage.getItem(CACHE_KEY)||"[]");
    return Array.isArray(v)?v.map(normalize):[];
  } catch (_) { return []; }
}

function writeCache(rows) {
  try { localStorage.setItem(CACHE_KEY,JSON.stringify(rows)); } catch (_) {}
}

async function loadRepoHistory(){
  try{
    const res=await fetch(REPO_HISTORY,{cache:"default"});
    if(!res.ok) throw new Error("repo history unavailable");
    const data=await res.json();
    return Array.isArray(data?.daily_draws)?data.daily_draws.map(normalize):[];
  }catch(_){
    return [];
  }
}

function pageNumbers(current,total){
  const out=[];
  const start=Math.max(1,Math.min(current-2,Math.max(1,total-4)));
  const end=Math.min(total,Math.max(5,current+2));
  for(let i=start;i<=end;i++) out.push(i);
  return out;
}

function renderPagination(total){
  const nav=$("#dailyHistoryPagination");
  const info=$("#dailyHistoryPageInfo");
  const pages=$("#dailyHistoryPages");
  if(!nav||!info||!pages) return;

  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  currentPage=Math.min(Math.max(1,currentPage),totalPages);

  if(total<=PAGE_SIZE){
    nav.hidden=true;
    pages.innerHTML="";
    return;
  }

  const from=(currentPage-1)*PAGE_SIZE+1;
  const to=Math.min(total,currentPage*PAGE_SIZE);
  info.textContent=`第 ${from}–${to} 筆，共 ${total} 筆 · 第 ${currentPage} / ${totalPages} 頁`;

  const nums=pageNumbers(currentPage,totalPages);
  let html=`<button class="daily-page-btn" type="button" data-daily-page="${currentPage-1}" ${currentPage===1?"disabled":""}>上一頁</button>`;
  if(nums[0]>1){
    html+='<button class="daily-page-btn" type="button" data-daily-page="1">1</button>';
    if(nums[0]>2) html+='<span class="daily-history-page-info">…</span>';
  }
  html+=nums.map(n=>`<button class="daily-page-btn ${n===currentPage?"active":""}" type="button" data-daily-page="${n}">${n}</button>`).join("");
  if(nums[nums.length-1]<totalPages){
    if(nums[nums.length-1]<totalPages-1) html+='<span class="daily-history-page-info">…</span>';
    html+=`<button class="daily-page-btn" type="button" data-daily-page="${totalPages}">${totalPages}</button>`;
  }
  html+=`<button class="daily-page-btn" type="button" data-daily-page="${currentPage+1}" ${currentPage===totalPages?"disabled":""}>下一頁</button>`;

  pages.innerHTML=html;
  nav.hidden=false;
}

function render(rows) {
  const list=$("#dailyHistoryList");
  if(!list) return;
  currentRows=rows.slice().sort((a,b)=>{
    const d=new Date(b.date)-new Date(a.date);
    return d || String(b.id).localeCompare(String(a.id));
  });

  $("#dailyMetricCount").textContent=String(currentRows.length);
  $("#dailyMetricPrimary").textContent=String(currentRows.filter(x=>x.draw_kind!=="daily_draw_supplement").length);
  $("#dailyMetricSupplement").textContent=String(currentRows.filter(x=>x.draw_kind==="daily_draw_supplement").length);

  const totalPages=Math.max(1,Math.ceil(currentRows.length/PAGE_SIZE));
  currentPage=Math.min(Math.max(1,currentPage),totalPages);
  const start=(currentPage-1)*PAGE_SIZE;
  const pageRows=currentRows.slice(start,start+PAGE_SIZE);

  list.innerHTML=pageRows.length?pageRows.map(x=>`
    <div class="daily-history-row">
      <small>${esc(x.date||"—")}</small>
      <strong>${esc(x.rune||"—")} · ${esc(x.direction||"—")}</strong>
      <small>${x.draw_kind==="daily_draw_supplement"?"補抽":"主抽"}</small>
    </div>`).join(""):'<div class="empty">尚無已儲存的實體牌紀錄。</div>';

  renderPagination(currentRows.length);
}

// Daily rune reads are repo/local only. Google Sheet is not part of the public read path.
// This keeps Lots usable even when Apps Script is unavailable or rate-limited.
async function loadRecords() {
  const repoRows=await loadRepoHistory();
  const cached=readCache();
  const rows=mergeRows(repoRows,cached);

  writeCache(rows);
  render(rows);
  $("#dailyStatsStatus").textContent=repoRows.length
    ?`已載入 Repo 每日符文歷史，共 ${rows.length} 筆。`
    :rows.length
      ?"Repo 歷史暫未回應；目前顯示本機已記錄資料。"
      :"每日符文歷史暫時無法載入。";
}

function populateRunes(){
  const select=$("#dailyRecordRune");
  if(!select) return;
  const items=(rune||[]).filter(x=>x&&Number(x.編號)>=1&&Number(x.編號)<=66);
  for(const item of items){
    const option=document.createElement("option");
    option.value=item.符文名稱;
    option.dataset.runeId=String(item.編號);
    option.textContent=String(item.編號).padStart(2,"0")+" · "+item.符文名稱;
    select.appendChild(option);
  }
}

async function saveRecord(ev){
  ev.preventDefault();
  const status=$("#dailyRecordStatus");
  const select=$("#dailyRecordRune");
  const selected=select?.selectedOptions?.[0];
  const dailyDraw={
    user_id:"lo3rwang",
    date:$("#dailyRecordDate").value,
    draw_kind:$("#dailyRecordKind").value,
    rune_id:selected?.dataset?.runeId||"",
    rune:select.value,
    direction:$("#dailyRecordDirection").value,
    note:$("#dailyRecordNote").value.trim(),
    source:"physical-card-manual-entry",
    confidence:"recorded"
  };
  if(!dailyDraw.date||!dailyDraw.rune){
    status.textContent="請先選擇日期與實體牌結果。";
    return;
  }

  // Make the newly entered record immediately available locally first.
  const optimistic=mergeRows(currentRows,[dailyDraw]);
  writeCache(optimistic);
  render(optimistic);
  status.textContent="實體牌紀錄已先儲存在本機；正在同步來源。";

  // Temporary write path: keep the existing Sheet writer until KV/editor write-through is deployed.
  // Public reads never depend on this request.
  try{
    const res=await fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"daily_draw",daily_draw:dailyDraw}),
      redirect:"follow"
    });
    const data=await res.json();
    if(!res.ok||data?.ok===false) throw new Error(data?.error||"同步失敗");
    status.textContent="實體牌紀錄已儲存；公開讀取不依賴 Google Sheet。";
    $("#dailyRecordNote").value="";
  }catch(err){
    status.textContent="已保留本機紀錄；遠端同步失敗："+err.message;
  }
}

window.addEventListener("DOMContentLoaded",()=>{
  const form=$("#dailyRecordForm");
  if(!form) return;
  populateRunes();
  $("#dailyRecordDate").value=new Date().toISOString().slice(0,10);
  form.addEventListener("submit",saveRecord);
  $("#dailyHistoryPages")?.addEventListener("click",ev=>{
    const btn=ev.target.closest("[data-daily-page]");
    if(!btn||btn.disabled) return;
    const next=Number(btn.dataset.dailyPage||1);
    if(!Number.isFinite(next)||next<1) return;
    currentPage=next;
    render(currentRows);
    $("#dailyHistoryList")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  loadRecords();
});
