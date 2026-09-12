// Canonical browser-side search source registry.
// Search data remains in its governed source files; this JS owns the browser source routing.
window.LOC_SEARCH_SOURCES = Object.freeze({
  "data/json/registries/LOC2_EVENT_REGISTRY.json": "data/json/registries/LOC2_EVENT_REGISTRY.json",
  "data/json/core/runes.json": "data/json/core/runes.json",
  "data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json": "data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json",
  "data/json/registries/LOC4_WRITING_REGISTRY.json": "data/json/registries/LOC4_WRITING_REGISTRY.json",
  "data/json/registries/LOC6_GOVERNANCE_REGISTRY.json": "data/json/registries/LOC6_GOVERNANCE_REGISTRY.json",
  "data/json/registries/LOC_MEDIA_REGISTRY.json": "data/json/registries/LOC_MEDIA_REGISTRY.json",
  "data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json": "data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json",
  "data/json/search/faq/LOC_FAQ_RAG_v0.4.json": "data/json/search/faq/LOC_FAQ_RAG_v0.4.json",
  "data/json/registries/LOC_ERA_REGISTRY.json": "data/json/registries/LOC_ERA_REGISTRY.json",
  "data/json/generated/search/SEARCH_SOURCE_STATS.json": "data/json/generated/search/SEARCH_SOURCE_STATS.json",
  "data/json/generated/search/reserved/moon-runes.json": "data/json/generated/search/reserved/moon-runes.json"
});

window.LOC_RESERVED_SEARCH = Object.freeze({
  "月之符文": {
    mode: "snapshot",
    snapshot: "data/json/generated/search/reserved/moon-runes.json",
    runtime_search: false
  }
});

window.addEventListener("DOMContentLoaded",()=>{
  const status=document.querySelector(".status");
  const results=document.querySelector(".groups");
  if(status&&results&&results.parentNode) results.after(status);

  const form=document.getElementById("searchForm");
  const query=document.getElementById("query");
  if(!form||!query||!status||!results) return;

  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const norm=value=>String(value??"").replace(/[\s\u3000]+/g,"").trim();

  async function renderReservedSnapshot(entry){
    status.className="status";
    status.textContent="正在載入網站搜尋快照…";
    results.innerHTML="";
    const response=await fetch(entry.snapshot);
    if(!response.ok) throw new Error("snapshot HTTP "+response.status);
    const data=await response.json();
    const guide=data.guide||{};
    const links=(guide.links||[]).map(link=>`
      <a class="secondary" href="${esc(link.href||'#')}">
        <strong>${esc(link.label||'前往')}</strong>${link.note?`<small>${esc(link.note)}</small>`:''}
      </a>`).join("");
    const cards=(data.first_page||[]).map(item=>`
      <article class="card">
        <div class="meta"><span class="pill">${esc(item.category||'網站快照')}</span><span class="pill">靜態第一頁</span></div>
        <h3>${esc(item.title||'')}</h3>
        <p class="summary">${esc(item.summary||'')}</p>
        <div class="links"><a class="secondary" href="${esc(item.href||'#')}">查看內容</a></div>
      </article>`).join("");

    results.innerHTML=`
      <section class="group reserved-search-guide">
        <div class="grouphead"><h2>${esc(guide.title||data.query||'搜尋導覽')}</h2><span>${esc(guide.eyebrow||'Reserved Search')}</span></div>
        <div class="cards">
          <article class="card synthesis-card">
            <h3>${esc(guide.subtitle||'')}</h3>
            <p class="synthesis-lead">${esc(guide.summary||'')}</p>
            ${links?`<div class="links">${links}</div>`:''}
          </article>
        </div>
      </section>
      <section class="group reserved-search-snapshot">
        <div class="grouphead"><h2>第一頁 · 網站快照</h2><span>更新於 ${esc(data.generated_at||'—')} · 不呼叫 Render</span></div>
        <div class="cards">${cards||'<div class="empty">目前沒有快照內容。</div>'}</div>
      </section>
      <section class="group reserved-search-more">
        <div class="cards">
          <article class="card">
            <h3>還要繼續找？</h3>
            <p class="summary">只有需要更多、更新後尚未進入快照的結果時，才啟動一般搜尋。</p>
            <div class="links"><button type="button" class="secondary" data-reserved-runtime-search>更多搜尋結果</button></div>
          </article>
        </div>
      </section>`;

    status.textContent=`「${data.query||'月之符文'}」已命中保留詞：目前顯示導覽與第一頁網站快照，未呼叫 Render。`;
    const pagination=document.getElementById("pagination");
    if(pagination) pagination.hidden=true;

    results.querySelector("[data-reserved-runtime-search]")?.addEventListener("click",()=>{
      window.__LOC_RESERVED_SEARCH_BYPASS_ONCE__=true;
      form.requestSubmit();
    });
  }

  form.addEventListener("submit",event=>{
    if(window.__LOC_RESERVED_SEARCH_BYPASS_ONCE__){
      window.__LOC_RESERVED_SEARCH_BYPASS_ONCE__=false;
      return;
    }
    const raw=query.value.trim();
    const key=norm(raw);
    const reserved=Object.entries(window.LOC_RESERVED_SEARCH||{}).find(([term])=>norm(term)===key);
    if(!reserved) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    renderReservedSnapshot(reserved[1]).catch(error=>{
      status.className="status error";
      status.textContent="保留詞快照載入失敗："+error.message;
    });
  },true);
});
