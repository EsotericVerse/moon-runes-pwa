import { mountQuickSelector } from './quick-selector.js';

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

  const all = runeRows.map(normalize).filter(r => Number.isInteger(r.編號) && r.編號 >= 0 && r.編號 <= 66);

  function infoBox(label, value){
    if (!value) return "";
    return `<div style="padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.025);font-size:.74rem;line-height:1.5"><strong style="display:block;color:var(--gold);font-size:.72rem">${esc(label)}</strong><span style="display:block;color:var(--muted);margin-top:2px">${esc(value)}</span></div>`;
  }

  function tile(r){
    const n = String(r.編號).padStart(2,"0");
    const visual = `<button class="rune-image-button" type="button" data-rune="${r.編號}" aria-label="查看 ${esc(r.符文名稱)} 符文進階文字說明"><img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" /></button>`;
    const infoPanel = `<div style="display:grid;gap:7px;margin-top:9px">${infoBox("卡片月相", r.月相)}${infoBox("關鍵詞", r.關鍵詞)}${infoBox("反向關鍵詞", r.反向關鍵字)}</div>`;
    return `<article class="rune-tile">${visual}<div class="rune-info"><span class="num">#${n}</span><div style="display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;color:var(--gold);margin-top:2px"><strong style="font-size:1.16rem;line-height:1.25">${esc(r.符文名稱)}</strong>${r.英文 ? `<span style="font-size:.76rem;font-weight:700;line-height:1.25;color:var(--gold);opacity:.88">${esc(r.英文)}</span>` : ""}</div>${infoPanel}</div></article>`;
  }

  function groupBox(meta){
    const ids = new Set((meta.runes || []).map(member => Number(member.id)).filter(id => id >= 1 && id <= 64));
    const items = all.filter(r => ids.has(r.編號)).sort((a,b) => a.編號 - b.編號);
    return `<section class="rune-group" id="rune-group-${esc(meta.id || meta.group_en || meta.group_zh)}" aria-label="${esc(meta.group_zh)} ${esc(meta.group_en)}"><div class="group-head"><div class="group-title"><strong>${esc(meta.group_zh)} ${esc(meta.group_en)}</strong><span class="group-note">${esc(meta.description)}</span></div><span class="group-count">${items.length} 枚符文</span></div><div class="group-row">${items.map(tile).join("")}</div></section>`;
  }

  const coreGroups = groups.filter(meta => (meta.runes || []).some(member => Number(member.id) >= 1 && Number(member.id) <= 64));
  const specialRunes = all.filter(r => r.編號 === 65 || r.編號 === 66).sort((a,b) => a.編號 - b.編號);

  if (grid) {
    const quickHost = document.createElement('div');
    quickHost.id = 'rune-group-quick-selector';
    grid.before(quickHost);

    mountQuickSelector({
      target: quickHost,
      items: coreGroups.map(meta => {
        const members = (meta.runes || []).filter(member => Number(member.id) >= 1 && Number(member.id) <= 64);
        const memberText = members.map(member => `${member.zh} ${member.en}`).join('、');
        return {
          id: meta.id || meta.group_en || meta.group_zh,
          label: meta.group_zh,
          kicker: `${meta.group_zh} · ${meta.group_en}`,
          title: meta.trait || meta.group_zh,
          description: meta.description,
          extra: [meta.style_module, memberText],
          href: `search.html?q=${encodeURIComponent(`${meta.group_zh}群組 方法論`)}`,
          linkLabel: `搜尋${meta.group_zh}群組方法論`
        };
      })
    });

    grid.innerHTML = `<p style="margin:0 0 14px;color:var(--muted);font-size:.82rem;">點選符文圖片可查看進階文字說明。</p>${coreGroups.map(groupBox).join("")}${specialRunes.length ? `<section class="rune-group" aria-label="特殊符文"><div class="group-head"><div class="group-title"><strong>特殊符文</strong><span class="group-note">玄與命不屬於 1–64 的八個基本群組，於八組之後額外列出。</span></div></div><div class="group-row">${specialRunes.map(tile).join("")}</div></section>` : ""}`;
  }
  if (count) count.textContent = "8 組 · 64 枚基本符文 + 2 枚特殊符文";

  const fields = [["英文","英文"],["關鍵詞","關鍵詞"],["反向關鍵詞","反向關鍵字"],["圖騰","圖騰"],["顯化形式","顯化形式"],["所屬分組","所屬分組"],["月相","月相"],["月相輔助說明","月相輔助說明"],["靈魂咒語","靈魂咒語"],["靈魂課題","靈魂課題"],["實踐挑戰","實踐挑戰"],["分組說明","分組說明"],["符文變化歷史","符文變化歷史"],["神話故事","神話故事"],["配套儀式建議","配套儀式建議"],["能量調和建議","能量調和建議"]];

  function openRune(r){
    if (!modal) return;
    modalTitle.textContent = `#${String(r.編號).padStart(2,"0")} · ${r.符文名稱}${r.英文 ? ` · ${r.英文}` : ""}`;
    modalImage.hidden = false;
    modalImage.src = "64images/" + encodeURIComponent(r.圖檔名稱);
    modalImage.alt = `${r.符文名稱}符文卡面`;
    modalSummary.innerHTML = [`<span class="pill">${esc(r.所屬分組)}</span>`,`<span class="pill">卡片月相：${esc(r.月相)}</span>`,`<span class="pill">${esc(r.顯化形式 || r.關鍵詞 || "")}</span>`].join("");
    const runeName = String(r.符文名稱 || "").trim();
    const searchUrl = `search.html?q=${encodeURIComponent(runeName + "之符文")}`;
    const methodUrl = `search.html?content_type=rune_algorithm&q=${encodeURIComponent(`符合${runeName}之符文演算法的文字`)}`;
    modalData.innerHTML = fields.filter(([,key]) => r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== "").map(([label,key]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(r[key])}</dd></div>`).join("") + `<div class="field"><dt>延伸查看</dt><dd><a href="${searchUrl}">尋找目前「${esc(runeName)}」之符文的資料</a><span aria-hidden="true"> · </span><a href="${methodUrl}">尋找符合「${esc(runeName)}」之符文演算法的文字</a></dd></div>`;
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
  modal?.addEventListener("close", () => { modalImage.removeAttribute("src"); modalImage.alt = ""; modalImage.hidden = false; });
});
