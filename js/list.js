document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const toolbar = document.querySelector("#group-filter")?.closest(".toolbar");
  const modal = document.querySelector("#rune-modal");
  const closeBtn = document.querySelector("#modal-close");
  const modalTitle = document.querySelector("#modal-title");
  const modalImage = document.querySelector("#modal-image");
  const modalSummary = document.querySelector("#modal-summary");
  const modalData = document.querySelector("#modal-data");

  // Library is a fixed one-page catalogue. Group selection is not part of this view.
  toolbar?.remove();

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  let runeRows = [];
  let groups = [];
  try {
    const [runeResponse, groupResponse] = await Promise.all([
      fetch("data/json/core/runes66.json", { cache: "no-store" }),
      fetch("data/json/core/runes66groups.json", { cache: "no-store" })
    ]);
    if (!runeResponse.ok) throw new Error(`runes66.json HTTP ${runeResponse.status}`);
    if (!groupResponse.ok) throw new Error(`runes66groups.json HTTP ${groupResponse.status}`);

    const runePayload = await runeResponse.json();
    const groupPayload = await groupResponse.json();
    runeRows = Array.isArray(runePayload) ? runePayload : (runePayload.runes || []);
    groups = Array.isArray(groupPayload) ? groupPayload : (groupPayload.groups || []);
  } catch (error) {
    console.error("Rune library data load failed", error);
    if (grid) grid.innerHTML = '<div class="empty">符文資料載入失敗，請重新整理頁面。</div>';
    return;
  }

  const groupByRuneId = new Map();
  for (const meta of groups) {
    for (const member of meta.runes || []) {
      const id = Number(member.id);
      if (Number.isInteger(id)) groupByRuneId.set(id, meta);
    }
  }

  function normalize(row){
    const id = Number(row.編號 ?? row.id);
    const meta = groupByRuneId.get(id) || null;
    const member = meta?.runes?.find(x => Number(x.id) === id);
    const name = row.符文名稱 ?? row.名稱 ?? row.name ?? member?.zh ?? "";
    return {
      ...row,
      編號: id,
      符文名稱: name,
      英文: row.英文 ?? row.english ?? member?.en ?? "",
      所屬分組: meta?.group_zh ?? row.所屬分組 ?? row.group ?? "",
      分組說明: meta?.description ?? row.分組說明 ?? "",
      月相: row.月相 ?? row.moon_phase ?? "",
      顯化形式: row.顯化形式 ?? row.keyword ?? "",
      關鍵詞: row.關鍵詞 ?? row.keyword ?? "",
      反向關鍵字: row.反向關鍵字 ?? row.反向關鍵詞 ?? row.reverse_keyword ?? "",
      Spec: row.Spec ?? row.spec ?? "",
      符文變化歷史: row.history?.符文變化歷史 ?? row.符文變化歷史 ?? "",
      神話故事: row.history?.神話故事 ?? row.神話故事 ?? "",
      圖檔名稱: row.image ?? row.圖檔名稱 ?? (id > 0 && name ? `${String(id).padStart(2,"0")}_${name}.png` : null),
      drawable: row.drawable ?? (id >= 1 && id <= 66),
      group_meta: meta
    };
  }

  const all = runeRows
    .map(normalize)
    .filter(r => Number.isInteger(r.編號) && r.編號 >= 0 && r.編號 <= 66);

  function tile(r){
    const isDe = r.編號 === 0;
    const special = isDe || r.編號 >= 65 ? " special" : "";
    const n = String(r.編號).padStart(2,"0");
    const visual = isDe
      ? `<button class="rune-image-button" type="button" data-rune="0" aria-label="查看 德 第零符資料"><div class="rune-thumb rune-thumb-de" aria-hidden="true">德</div></button>`
      : `<button class="rune-image-button" type="button" data-rune="${r.編號}" aria-label="查看 ${esc(r.符文名稱)} 符文資料"><img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" /></button>`;

    const keywordPanel = (r.關鍵詞 || r.反向關鍵字)
      ? `<div style="margin-top:9px;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.025);font-size:.74rem;line-height:1.5">
          ${r.關鍵詞 ? `<strong style="display:block;color:var(--gold);font-size:.72rem">關鍵詞</strong><span style="display:block;color:var(--muted);margin-top:2px">${esc(r.關鍵詞)}</span>` : ""}
          ${r.反向關鍵字 ? `<strong style="display:block;color:var(--gold);font-size:.72rem;margin-top:8px">反向關鍵詞</strong><span style="display:block;color:var(--muted);margin-top:2px">${esc(r.反向關鍵字)}</span>` : ""}
        </div>`
      : "";

    return `<article class="rune-tile${special}">
      ${visual}
      <div class="rune-info">
        <span class="num">#${n}</span>
        <span class="name">${esc(r.符文名稱)}${r.英文 ? ` <span class="en" style="display:inline">${esc(r.英文)}</span>` : ""}</span>
        ${keywordPanel}
        <span class="meta">${isDe ? '<span class="pill">誌銘</span>' : `<span class="pill">卡片月相：${esc(r.月相)}</span>`}</span>
      </div>
    </article>`;
  }

  function groupBox(meta){
    const ids = new Set((meta.runes || []).map(member => Number(member.id)));
    const items = all.filter(r => ids.has(r.編號));
    if (meta.group_zh === "特殊") {
      const order = new Map([[65,0],[66,1],[0,2]]);
      items.sort((a,b) => (order.get(a.編號) ?? 99) - (order.get(b.編號) ?? 99));
    } else {
      items.sort((a,b) => a.編號 - b.編號);
    }

    const tone = Array.isArray(meta.possible_tone) ? meta.possible_tone.join("、") : String(meta.possible_tone || "");
    const styleText = Array.isArray(meta.style) ? meta.style.join(" / ") : String(meta.style || "");
    const drawableCount = items.filter(r => r.編號 !== 0).length;
    const hasDe = items.some(r => r.編號 === 0);
    const countText = meta.group_zh === "特殊"
      ? `${drawableCount} 枚特殊符文${hasDe ? " + 1 枚誌銘" : ""}`
      : `${drawableCount} 枚符文`;

    return `<section class="rune-group" aria-label="${esc(meta.group_zh)} ${esc(meta.group_en)}">
      <div class="group-head">
        <div class="group-title">
          <strong>${esc(meta.group_zh)} ${esc(meta.group_en)}</strong>
          <div class="group-tone"><b>${esc(meta.trait)}</b> · ${esc(meta.style_module)}</div>
          <span class="group-note">${esc(meta.description)}</span>
          <span class="group-note">可能語氣：${esc(tone)} · style：${esc(styleText)}</span>
        </div>
        <span class="group-count">${esc(countText)}</span>
      </div>
      <div class="group-row">${items.map(tile).join("")}</div>
    </section>`;
  }

  if (grid) grid.innerHTML = groups.map(groupBox).join("");
  if (count) count.textContent = "9 組 · 66 枚可抽取符文 + 第 0 符德";

  const fields = [
    ["英文","英文"],["關鍵詞","關鍵詞"],["反向關鍵詞","反向關鍵字"],["圖騰","圖騰"],["顯化形式","顯化形式"],["所屬分組","所屬分組"],["月相","月相"],
    ["月相輔助說明","月相輔助說明"],["靈魂咒語","靈魂咒語"],["靈魂課題","靈魂課題"],
    ["實踐挑戰","實踐挑戰"],["分組說明","分組說明"],["符文變化歷史","符文變化歷史"],
    ["神話故事","神話故事"],["配套儀式建議","配套儀式建議"],["能量調和建議","能量調和建議"]
  ];

  function openRune(r){
    if (!modal) return;
    modalTitle.textContent = `#${String(r.編號).padStart(2,"0")} · ${r.符文名稱}${r.英文 ? ` · ${r.英文}` : ""}`;
    const isDe = r.編號 === 0;

    if (isDe) {
      modalImage.removeAttribute("src");
      modalImage.alt = "";
      modalImage.hidden = true;
    } else {
      modalImage.hidden = false;
      modalImage.src = "64images/" + encodeURIComponent(r.圖檔名稱);
      modalImage.alt = `${r.符文名稱}符文卡面`;
    }

    modalSummary.innerHTML = isDe ? [
      '<span class="pill">特殊</span>',
      '<span class="pill">作者誌銘</span>',
      '<span class="pill">不參與抽牌</span>'
    ].join("") : [
      `<span class="pill">${esc(r.所屬分組)}</span>`,
      `<span class="pill">卡片月相：${esc(r.月相)}</span>`,
      `<span class="pill">${esc(r.顯化形式 || r.關鍵詞 || "")}</span>`
    ].join("");

    if (isDe) {
      modalData.innerHTML = [
        ["英文", r.英文],
        ["關鍵詞", r.關鍵詞],
        ["反向關鍵詞", r.反向關鍵字],
        ["所屬分組", "特殊 Special"],
        ["定位", "作者／月語者個人誌銘；不參與抽牌"],
        ["基本定義", r.Spec],
        ["分組說明", r.分組說明],
        ["History", r.符文變化歷史]
      ].filter(([,value]) => value).map(([label,value]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
      modal.showModal();
      return;
    }

    const runeName = String(r.符文名稱 || "").trim();
    const searchUrl = `search.html?q=${encodeURIComponent(runeName + "之符文")}`;
    const methodUrl = `search.html?content_type=rune_algorithm&q=${encodeURIComponent(`符合${runeName}之符文演算法的文字`)}`;
    modalData.innerHTML = fields
      .filter(([,key]) => r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== "")
      .map(([label,key]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(r[key])}</dd></div>`)
      .join("") + `<div class="field"><dt>延伸查看</dt><dd><a href="${searchUrl}">尋找目前「${esc(runeName)}」之符文的資料</a><span aria-hidden="true"> · </span><a href="${methodUrl}">尋找符合「${esc(runeName)}」之符文演算法的文字</a></dd></div>`;
    modal.showModal();
  }

  grid?.addEventListener("click", event => {
    const button = event.target.closest("[data-rune]");
    if (!button) return;
    const selected = all.find(r => r.編號 === Number(button.dataset.rune));
    if (selected) openRune(selected);
  });

  closeBtn?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", event => { if (event.target === modal) modal.close(); });
  modal?.addEventListener("close", () => {
    modalImage.removeAttribute("src");
    modalImage.alt = "";
    modalImage.hidden = false;
  });
});
