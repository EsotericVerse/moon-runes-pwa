import { mountQuickSelector } from './quick-selector.js';

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const toolbar = document.querySelector("#group-filter")?.closest(".toolbar");
  const overviewLink = document.querySelector('.overview-image-link');
  const overviewHead = document.querySelector('.rune-overview-head');
  const overviewCopy = document.querySelector('.rune-overview-head p');
  const downloadSection = document.querySelector('.physical-card-download');
  const headerCopies = Array.from(document.querySelectorAll('.loc-header-copy'));

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

    .special-rune-section{
      margin:18px 0;
      padding:18px 20px;
      border:1px solid var(--line);
      border-radius:18px;
      background:rgba(11,27,49,.56);
    }
    .special-rune-section h2{margin:0;color:var(--gold);font-size:1.08rem;}
    .special-rune-section>p{margin:4px 0 0;color:var(--muted);font-size:.82rem;line-height:1.6;}
    .special-rune-row{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:20px;
      margin-top:16px;
    }
    .special-rune-card{
      display:grid;
      grid-template-columns:minmax(128px,180px) minmax(0,1fr);
      gap:18px;
      align-items:start;
      padding:18px;
      border:1px solid var(--line);
      border-radius:16px;
      background:rgba(255,255,255,.025);
    }
    .special-rune-card .rune-thumb{width:100%;height:auto;display:block;border-radius:10px;}
    .special-rune-copy{min-width:0;}
    .special-rune-name{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;color:var(--gold);margin:2px 0 12px;}
    .special-rune-name strong{font-size:1.35rem;line-height:1.25;}
    .special-rune-name span{font-size:.8rem;font-weight:700;opacity:.88;}
    .special-rune-meta{display:grid;gap:10px;}
    .special-rune-meta p{margin:0;color:var(--muted);font-size:.82rem;line-height:1.65;}
    .special-rune-meta strong{display:block;margin-bottom:2px;color:var(--gold);font-size:.74rem;}
    .rune-overview-summary{margin:0 0 8px;color:var(--muted);line-height:1.7;}

    @media (max-width:760px){
      .quick-selector-modal .group-row{grid-template-columns:repeat(2,minmax(0,1fr));}
      .special-rune-row{grid-template-columns:1fr;}
      .special-rune-card{grid-template-columns:minmax(110px,150px) minmax(0,1fr);}
    }
    @media (max-width:520px){
      .special-rune-card{grid-template-columns:1fr;}
      .special-rune-card .rune-thumb{max-width:220px;margin:0 auto;}
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

  function specialTile(r){
    const n = String(r.編號).padStart(2,"0");
    const meta = [
      ["卡片月相", r.月相],
      ["關鍵詞", r.關鍵詞],
      ["反向關鍵詞", r.反向關鍵字],
      ["符文變化歷史", r.符文變化歷史]
    ].filter(([,value]) => value && String(value).trim());
    return `<article class="special-rune-card"><img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面" loading="lazy" decoding="async" /><div class="special-rune-copy"><span class="num">#${n}</span><div class="special-rune-name"><strong>${esc(r.符文名稱)}</strong>${r.英文 ? `<span>${esc(r.英文)}</span>` : ""}</div><div class="special-rune-meta">${meta.map(([label,value]) => `<p><strong>${esc(label)}</strong>${esc(value)}</p>`).join("")}</div></div></article>`;
  }

  const coreGroups = groups.filter(meta => (meta.runes || []).some(member => Number(member.id) >= 1 && Number(member.id) <= 64));
  const specialRunes = all.filter(r => r.編號 === 65 || r.編號 === 66).sort((a,b) => a.編號 - b.編號);

  if (overviewHead) {
    const summary = document.createElement('p');
    summary.className = 'rune-overview-summary';
    summary.innerHTML = `資料共 67 筆：1–64 為八個基本群組，65「玄」與 66「命」為特殊符文；第 0 符「德」為作者／月語者誌銘，不參與抽牌、沒有卡面。<a href="governance.html#de-rune">了解德之符文的治理定位 →</a>`;
    overviewHead.insertBefore(summary, overviewCopy || null);
  }

  headerCopies.forEach(node => node.remove());

  if (overviewCopy) {
    overviewCopy.textContent = "點選圖上的八個群組，可查看各組說明與符文資料。";
  }

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

  if (specialRunes.length) {
    const specialSection = document.createElement('section');
    specialSection.className = 'special-rune-section';
    specialSection.setAttribute('aria-label', '特殊符文');
    specialSection.innerHTML = `<h2>特殊符文</h2><p>玄與命位於 1–64 八組之外。</p><div class="special-rune-row">${specialRunes.map(specialTile).join("")}</div>`;
    if (downloadSection) downloadSection.before(specialSection);
    else overviewLink?.closest('.rune-overview')?.after(specialSection);
  }

  if (grid) {
    grid.innerHTML = "";
    grid.hidden = true;
  }
  if (count) count.textContent = "8 組 · 64 枚基本符文 + 2 枚特殊符文";
});
