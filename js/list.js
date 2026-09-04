document.addEventListener("DOMContentLoaded", () => {
  const all = (window.getRunes64?.() || [])
    .filter(r => r && Number(r.編號) >= 1 && Number(r.編號) <= 66)
    .sort((a,b) => Number(a.編號) - Number(b.編號));

  const grid = document.querySelector("#rune-grid");
  const search = document.querySelector("#rune-search");
  const group = document.querySelector("#group-filter");
  const count = document.querySelector("#rune-count");
  const modal = document.querySelector("#rune-modal");
  const closeBtn = document.querySelector("#modal-close");
  const modalTitle = document.querySelector("#modal-title");
  const modalImage = document.querySelector("#modal-image");
  const modalSummary = document.querySelector("#modal-summary");
  const modalData = document.querySelector("#modal-data");

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  function tile(r){
    const special = Number(r.編號) >= 65 ? " special" : "";
    const n = String(r.編號).padStart(2,"0");
    return `<button class="rune-tile${special}" type="button" data-rune="${r.編號}" aria-label="查看 ${esc(r.符文名稱)} 符文資料">
      <span class="num">#${n}</span>
      <span class="glyph">${esc(r.圖騰 || "◌")}</span>
      <span class="name">${esc(r.符文名稱)}</span>
      <span class="en">${esc(r.英文)}</span>
      <span class="meta"><span class="pill">${esc(r.所屬分組)}</span><span class="pill">${esc(r.月相)}</span></span>
    </button>`;
  }

  function render(){
    const q = search.value.trim().toLowerCase();
    const g = group.value;
    const filtered = all.filter(r => {
      const hay = [r.編號,r.符文名稱,r.英文,r.所屬分組,r.月相].join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (!g || r.所屬分組 === g);
    });
    count.textContent = `${filtered.length} / ${all.length}`;
    grid.innerHTML = filtered.length ? filtered.map(tile).join("") : '<div class="empty">沒有符合條件的符文。</div>';
  }

  const fields = [
    ["英文","英文"],["圖騰","圖騰"],["顯化形式","顯化形式"],["所屬分組","所屬分組"],["月相","月相"],
    ["月相輔助說明","月相輔助說明"],["靈魂咒語","靈魂咒語"],["靈魂課題","靈魂課題"],
    ["實踐挑戰","實踐挑戰"],["分組說明","分組說明"],["符文變化歷史","符文變化歷史"],
    ["神話故事","神話故事"],["配套儀式建議","配套儀式建議"],["能量調和建議","能量調和建議"]
  ];

  function openRune(r){
    modalTitle.textContent = `#${String(r.編號).padStart(2,"0")} · ${r.符文名稱}`;
    modalImage.src = "64images/" + r.圖檔名稱;
    modalImage.alt = `${r.符文名稱}符文卡面`;
    modalSummary.innerHTML = [
      `<span class="pill">${esc(r.所屬分組)}</span>`,
      `<span class="pill">${esc(r.月相)}</span>`,
      `<span class="pill">${esc(r.顯化形式)}</span>`
    ].join("");
    modalData.innerHTML = fields
      .filter(([,key]) => r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== "")
      .map(([label,key]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(r[key])}</dd></div>`)
      .join("");
    modal.showModal();
  }

  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-rune]");
    if(!btn) return;
    const r = all.find(x => Number(x.編號) === Number(btn.dataset.rune));
    if(r) openRune(r);
  });

  search.addEventListener("input", render);
  group.addEventListener("change", render);
  closeBtn.addEventListener("click", () => modal.close());
  modal.addEventListener("click", e => {
    if(e.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    modalImage.removeAttribute("src");
    modalImage.alt = "";
  });

  render();
});