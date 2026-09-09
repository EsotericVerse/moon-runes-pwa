import { rune, groups } from './runes66.js';

document.addEventListener("DOMContentLoaded", async () => {
  const drawable = (rune || [])
    .filter(r => r && Number(r.編號) >= 1 && Number(r.編號) <= 66)
    .sort((a,b) => Number(a.編號) - Number(b.編號));

  let deRune = null;
  try {
    const response = await fetch("data/json/core/runes66.json");
    if (response.ok) {
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : (payload.runes || []);
      const de = rows.find(r => Number(r.編號 ?? r.id) === 0);
      if (de) {
        const specialMeta = groups.find(g => g.group_zh === "特殊") || null;
        deRune = {
          ...de,
          編號: 0,
          符文名稱: de.符文名稱 ?? de.名稱 ?? de.name ?? "德",
          英文: de.英文 ?? de.english ?? "Virtue",
          所屬分組: "特殊",
          分組說明: specialMeta?.description ?? "",
          月相: de.月相 ?? de.moon_phase ?? "不適用",
          顯化形式: de.顯化形式 ?? de.keyword ?? "作者誌銘・治理・集合",
          關鍵詞: de.關鍵詞 ?? de.keyword ?? "",
          Spec: de.Spec ?? de.spec ?? "",
          符文變化歷史: de.history?.符文變化歷史 ?? de.符文變化歷史 ?? "",
          drawable: false,
          圖檔名稱: null
        };
      }
    }
  } catch (error) {
    console.warn("Rune 0 德資料載入失敗，66 枚可抽取符文仍可正常顯示。", error);
  }

  const all = deRune ? [...drawable, deRune] : drawable;
  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const groupFilter = document.querySelector("#group-filter");
  const modal = document.querySelector("#rune-modal");
  const closeBtn = document.querySelector("#modal-close");
  const modalTitle = document.querySelector("#modal-title");
  const modalImage = document.querySelector("#modal-image");
  const modalSummary = document.querySelector("#modal-summary");
  const modalData = document.querySelector("#modal-data");

  // Group membership is canonical and fixed. It is not a user-selectable filter.
  groupFilter?.remove();

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  function tile(r){
    const isDe = Number(r.編號) === 0;
    const special = isDe || Number(r.編號) >= 65 ? " special" : "";
    const n = String(r.編號).padStart(2,"0");
    const visual = isDe
      ? `<button class="rune-image-button" type="button" data-rune="0" aria-label="查看 德 第零符資料"><div class="rune-thumb rune-thumb-de" aria-hidden="true">德</div></button>`
      : `<button class="rune-image-button" type="button" data-rune="${r.編號}" aria-label="查看 ${esc(r.符文名稱)} 符文資料"><img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" /></button>`;
    return `<article class="rune-tile${special}">
      ${visual}
      <div class="rune-info">
        <span class="num">#${n}</span>
        <span class="name">${esc(r.符文名稱)}</span>
        <span class="en">${esc(r.英文)}</span>
        <span class="meta"><span class="pill">${esc(r.所屬分組)}</span>${isDe ? '<span class="pill">誌銘</span>' : `<span class="pill">${esc(r.月相)}</span>`}</span>
      </div>
    </article>`;
  }

  function groupBox(meta, items){
    const tone = Array.isArray(meta.possible_tone) ? meta.possible_tone.join("、") : String(meta.possible_tone || "");
    const styleText = Array.isArray(meta.style) ? meta.style.join(" / ") : String(meta.style || "");
    const drawableCount = items.filter(r => Number(r.編號) !== 0).length;
    const hasDe = items.some(r => Number(r.編號) === 0);
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

  const sections = groups.map(meta => {
    const ids = new Set((meta.runes || []).map(member => Number(member.id)));
    const items = all.filter(r => ids.has(Number(r.編號)));
    if (meta.group_zh === "特殊") {
      const order = new Map([[65,0],[66,1],[0,2]]);
      items.sort((a,b) => (order.get(Number(a.編號)) ?? 99) - (order.get(Number(b.編號)) ?? 99));
    } else {
      items.sort((a,b) => Number(a.編號) - Number(b.編號));
    }
    return groupBox(meta, items);
  });

  grid.innerHTML = sections.join("");
  if (count) count.textContent = "9 組 · 66 枚可抽取符文 + 第 0 符德";

  const fields = [
    ["英文","英文"],["圖騰","圖騰"],["顯化形式","顯化形式"],["所屬分組","所屬分組"],["月相","月相"],
    ["月相輔助說明","月相輔助說明"],["靈魂咒語","靈魂咒語"],["靈魂課題","靈魂課題"],
    ["實踐挑戰","實踐挑戰"],["分組說明","分組說明"],["符文變化歷史","符文變化歷史"],
    ["神話故事","神話故事"],["配套儀式建議","配套儀式建議"],["能量調和建議","能量調和建議"]
  ];

  function openRune(r){
    if (!modal) return;
    modalTitle.textContent = `#${String(r.編號).padStart(2,"0")} · ${r.符文名稱}`;
    const isDe = Number(r.編號) === 0;
    if(isDe){
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
      `<span class="pill">${esc(r.月相)}</span>`,
      `<span class="pill">${esc(r.顯化形式 || r.關鍵詞 || "")}</span>`
    ].join("");

    if(isDe){
      modalData.innerHTML = [
        ['英文', r.英文],['所屬分組', '特殊 Special'],['定位', '作者／月語者個人誌銘；不參與抽牌'],
        ['基本定義', r.Spec],['分組說明', r.分組說明],['History', r.符文變化歷史]
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

  grid?.addEventListener("click", e => {
    const btn = e.target.closest("[data-rune]");
    if(!btn) return;
    const r = all.find(x => Number(x.編號) === Number(btn.dataset.rune));
    if(r) openRune(r);
  });

  closeBtn?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", e => { if(e.target === modal) modal.close(); });
  modal?.addEventListener("close", () => {
    modalImage.removeAttribute("src");
    modalImage.alt = "";
    modalImage.hidden = false;
  });
});