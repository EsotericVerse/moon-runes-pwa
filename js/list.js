import { mountQuickSelector } from './quick-selector.js';

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const toolbar = document.querySelector("#group-filter")?.closest(".toolbar");
  const overviewLink = document.querySelector('.overview-image-link');

  toolbar?.remove();

  const layoutStyle = document.createElement('style');
  layoutStyle.id = 'rune-group-modal-layout-style';
  layoutStyle.textContent = `
    .quick-selector-modal .group-row{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:12px;
      align-items:start;
    }
    .quick-selector-modal .rune-tile{min-width:0;width:100%;}
    .quick-selector-modal .rune-thumb{width:100%;height:auto;display:block;}
    @media (max-width:760px){
      .quick-selector-modal .group-row{grid-template-columns:repeat(2,minmax(0,1fr));}
    }
  `;
  document.head.appendChild(layoutStyle);

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
      月相: row.月相 ?? row.moon_phase ?? "",
      顯化形式: row.顯化形式 ?? row.keyword ?? "",
      關鍵詞: row.關鍵詞 ?? row.keyword ?? "",
      反向關鍵字: row.反向關鍵字 ?? row.反向關鍵詞 ?? row.reverse_keyword ?? "",
      符文變化歷史: row.history?.符文變化歷史 ?? row.符文變化歷史 ?? "",
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
    const visual = `<img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" />`;
    const infoPanel = `<div style="display:grid;gap:7px;margin-top:9px">${infoBox("卡片月相", r.月相)}${infoBox("關鍵詞", r.關鍵詞)}${infoBox("反向關鍵詞", r.反向關鍵字)}${infoBox("符文變化歷史", r.符文變化歷史)}</div>`;
    return `<article class="rune-tile">${visual}<div class="rune-info"><span class="num">#${n}</span><div style="display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;color:var(--gold);margin-top:2px"><strong style="font-size:1.16rem;line-height:1.25">${esc(r.符文名稱)}</strong>${r.英文 ? `<span style="font-size:.76rem;font-weight:700;line-height:1.25;color:var(--gold);opacity:.88">${esc(r.英文)}</span>` : ""}</div>${infoPanel}</div></article>`;
  }

  const coreGroups = groups.filter(meta => (meta.runes || []).some(member => Number(member.id) >= 1 && Number(member.id) <= 64));
  const specialRunes = all.filter(r => r.編號 === 65 || r.編號 === 66).sort((a,b) => a.編號 - b.編號);

  if (overviewLink && coreGroups.length) {
    const quickHost = document.createElement('div');
    quickHost.id = 'rune-group-quick-selector';
    overviewLink.after(quickHost);

    mountQuickSelector({
      target: quickHost,
      imageTarget: overviewLink,
      display: 'modal',
      items: coreGroups.map(meta => ({
        id: meta.id || meta.group_en || meta.group_zh,
        label: meta.group_zh,
        kicker: meta.group_en,
        title: meta.group_zh,
        description: meta.description,
        extra: [
          meta.trait ? `特質：${meta.trait}` : '',
          meta.style_module ? `風格模組：${meta.style_module}` : '',
          Array.isArray(meta.possible_tone) && meta.possible_tone.length ? `可能語氣：${meta.possible_tone.join('、')}` : ''
        ].filter(Boolean),
        href: `search.html?q=${encodeURIComponent(`月之符文 ${meta.group_zh}群組 方法論`)}`,
        linkLabel: `搜尋${meta.group_zh}群組方法論`,
        runeIds: (meta.runes || []).map(member => Number(member.id)).filter(id => id >= 1 && id <= 64)
      })),
      renderContent: item => {
        const ids = new Set(item.runeIds || []);
        const items = all.filter(r => ids.has(r.編號)).sort((a,b) => a.編號 - b.編號);
        return `<div class="group-row">${items.map(tile).join("")}</div>`;
      }
    });
  }

  if (grid) {
    grid.innerHTML = `<p style="margin:0 0 14px;color:var(--muted);font-size:.82rem;">點選總覽圖上的八個群組按鈕，會開啟浮動快速說明；每枚符文的卡面、月相、關鍵詞、反向關鍵詞與變化歷史都直接顯示在同一層。</p>${specialRunes.length ? `<section class="rune-group" aria-label="特殊符文"><div class="group-head"><div class="group-title"><strong>特殊符文</strong><span class="group-note">玄與命不屬於 1–64 的八個基本群組，於八組之外額外列出。</span></div></div><div class="group-row">${specialRunes.map(tile).join("")}</div></section>` : ""}`;
  }
  if (count) count.textContent = "8 組 · 64 枚基本符文 + 2 枚特殊符文";
});
