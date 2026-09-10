import { mountQuickSelector } from './quick-selector.js';

document.addEventListener("DOMContentLoaded", async () => {
  function organizeRuneWorkspace(){
    const referenceView = document.getElementById('referenceView');
    const examplesView = document.getElementById('examplesView');
    const systemsView = document.getElementById('systemsView');
    const drawView = document.getElementById('drawView');

    const refButton = document.querySelector('[data-runes-view="reference"]');
    if (refButton) {
      const group = refButton.closest('.workspace-nav-group');
      const label = group?.querySelector('.workspace-nav-label');
      if (label) label.textContent = '03 · 解析';
      const strong = refButton.querySelector('strong');
      const small = refButton.querySelector('small');
      if (strong) strong.textContent = '符文基本解析方式';
      if (small) small.textContent = '本義 · 方向 · 卡位 · 範例';
    }

    const examplesButton = document.querySelector('[data-runes-view="examples"]');
    examplesButton?.closest('.workspace-nav-group')?.remove();

    const systemsButton = document.querySelector('[data-runes-view="systems"]');
    if (systemsButton) {
      const group = systemsButton.closest('.workspace-nav-group');
      const label = group?.querySelector('.workspace-nav-label');
      if (label) label.textContent = '04 · 體系';
      const small = systemsButton.querySelector('small');
      if (small) small.textContent = '脈絡 · 體系 · 演算法 · 演化';
    }

    const libraryButton = document.querySelector('[data-runes-view="library"]');
    if (libraryButton) {
      const group = libraryButton.closest('.workspace-nav-group');
      const label = group?.querySelector('.workspace-nav-label');
      if (label) label.textContent = '05 · 資料';
    }

    const workspaceFoot = document.querySelector('.workspace-foot');
    if (workspaceFoot) workspaceFoot.textContent = '抽牌、符文趨勢分析、符文基本解析方式、多元體系與符文資料都在同一頁。';

    if (referenceView) {
      const header = referenceView.querySelector('.loc-header');
      if (header) {
        const meta = header.querySelector('.loc-header-meta');
        const title = header.querySelector('.loc-header-title');
        const subtitle = header.querySelector('.loc-header-subtitle');
        const copy = header.querySelector('.loc-header-copy');
        if (meta) meta.textContent = 'LunaRunes · Reading Guide';
        if (title) title.textContent = '符文基本解析方式';
        if (subtitle) subtitle.textContent = '從符文本義、方向與卡位開始，再進入完整判讀。';
        if (copy) copy.textContent = '先確認每張符文代表什麼，再依方向與卡位閱讀組合；占卜結果範例也集中在這裡，方便對照實際判讀方式。';
      }

      [...referenceView.querySelectorAll('.rune-basics')].forEach(section => {
        const heading = section.querySelector(':scope > h2');
        if (heading?.textContent.trim() === '基本文件') section.remove();
      });

      referenceView.querySelector('[data-open-view="library"]')?.remove();

      [...referenceView.querySelectorAll('.basic-item')].forEach(item => {
        const strong = item.querySelector('strong');
        const span = item.querySelector('span');
        if (strong?.textContent.trim() === '不用背卡' && span) {
          span.textContent = '先抽、先看，再需要時展開符文本義與脈絡。';
        }
      });

      if (examplesView) {
        const exampleSections = [...examplesView.querySelectorAll(':scope > section')];
        exampleSections.forEach((section, index) => {
          if (index === 0) {
            const heading = section.querySelector(':scope > h2');
            if (heading) heading.textContent = '占卜結果範例';
          }
          referenceView.appendChild(section);
        });
        examplesView.remove();
      }
    }

    if (drawView && !document.getElementById('draw-algorithm-intro')) {
      const selector = document.getElementById('draw-mode-selector');
      const section = document.createElement('section');
      section.className = 'rune-basics';
      section.id = 'draw-algorithm-intro';
      section.innerHTML = `
        <h2>抽牌演算法</h2>
        <p>抽牌演算法決定「抽幾張、每張放在哪個位置、彼此怎麼連起來讀」。符文本義不因演算法改變，改變的是卡位責任與組合方式。</p>
        <div class="reading-ref-grid">
          <article class="reading-ref-card"><h3>單卡</h3><p>以一張符文作為當下核心，先讀符文本義，再依方向與月相補充狀態。</p></article>
          <article class="reading-ref-card"><h3>雙卡</h3><p><strong>因 → 果</strong>。第一張描述來源或原因，第二張描述主要結果或落點。</p></article>
          <article class="reading-ref-card"><h3>三卡</h3><p><strong>源 → 轉 → 合</strong>。從來源、轉折到整合，形成一條基本語意鏈。</p></article>
          <article class="reading-ref-card"><h3>五卡</h3><p><strong>過去 → 現在 → 未來顯化 → 周圍環境 → 自己心境</strong>。五個位置各自負責不同層面，再整合成完整判讀。</p></article>
          <article class="reading-ref-card"><h3>OW3gs · 11 卡</h3><p><strong>1–6 為因的描述層，7–11 為果的判定層</strong>。先以 7–11 形成核心判定，再回看 1–6 補足背景、條件與原因。</p></article>
        </div>
      `;
      if (selector) selector.after(section);
      else drawView.prepend(section);
    }

    if (systemsView) {
      const header = systemsView.querySelector('.loc-header');
      if (header) {
        const subtitle = header.querySelector('.loc-header-subtitle');
        const copy = header.querySelector('.loc-header-copy');
        if (subtitle) subtitle.textContent = '由月之符文延伸出的脈絡、體系、演算法與演化。';
        if (copy) copy.textContent = '這裡整理月之符文向外延伸後形成的幾種主要形式，方便從符文本身一路看到作品、方法與時間變化。';
      }

      [...systemsView.querySelectorAll('.reading-ref-card')].forEach(card => {
        const heading = card.querySelector('h3');
        if (!heading) return;

        if (heading.textContent.trim() === '符文體系') {
          card.innerHTML = `
            <h3>符文體系</h3>
            <p>符文可以延伸成不同形式的作品與表達方式；作品保留自己的內容，同時記錄它與符文來源之間的關係。</p>
            <ul>
              <li><strong>符文文學：</strong>把符文展開成角色、情境、事件、段落與完整故事。代表作品可從 <a href="https://vocus.cc/article/6829d52cfd8978000109b281" target="_blank" rel="noopener">《月語者》第一篇〈現在，下弦之卷〉</a> 開始閱讀。</li>
              <li><strong>符文歌曲：</strong>以實際 OW3gs 11 張抽牌結果作為創作來源，再轉化成歌詞與音樂。現行確認作品包括〈在塵裡長出的光〉、〈日蝕之前的顯現〉、〈界內之風〉、〈界外誤差〉。<a href="search.html?q=%E7%AC%A6%E6%96%87%E6%AD%8C%E6%9B%B2">查看符文歌曲清單與作品連結 →</a></li>
            </ul>
          `;
        }

        if (heading.textContent.trim() === '符文演算') {
          card.innerHTML = `
            <h3>符文演算法</h3>
            <p>符文演算法講的是「方法」：把符文本義、方向、卡位與組合規則整理成可以重複使用的判讀流程。單卡、雙卡、三卡、五卡與 OW3gs 都是不同的抽牌演算法。</p>
            <p>演算法負責怎麼算、怎麼讀；它不等於符文本身，也不等於符文體系作品。</p>
          `;
        }

        if (heading.textContent.trim() === '符文演化') {
          card.innerHTML = `
            <h3>符文演化</h3>
            <p>符文演化講的是「時間中的改變」：觀察符文、作品與概念在不同時期如何出現、偏移、重組與形成趨勢。</p>
            <p>演算法處理方法；演化處理時間與變化，兩者分開。</p>
          `;
        }
      });
    }
  }

  organizeRuneWorkspace();

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
    .rune-result-name{display:flex;align-items:baseline;gap:.5em;flex-wrap:wrap;}
    .rune-result-name small{display:inline;margin:0;}
    .rune-result-group-link{color:var(--gold);font-weight:800;text-decoration:none;}
    .rune-result-group-link:hover,.rune-result-group-link:focus-visible{text-decoration:underline;}
    .ritual-left .rune-result-card{margin:0;}
    .ritual-left .rune-result-image{max-width:260px;margin:0 auto;}

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
  const runeByName = new Map(all.filter(r => r.符文名稱).map(r => [r.符文名稱, r]));

  function keywordForDirection(runeRow, directionName){
    const negative = directionName === '逆位' || directionName === '半逆位';
    if (negative) return runeRow?.負面關鍵詞 || runeRow?.反向關鍵字 || runeRow?.反向關鍵詞 || runeRow?.關鍵詞 || '—';
    return runeRow?.正面關鍵詞 || runeRow?.關鍵詞 || '—';
  }

  function renderRitualPreview(){
    const host = document.querySelector('#ritual-view .ritual-left');
    const r = all.find(item => item.編號 === 65);
    if (!host || !r) return;
    const realPhase = window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知';
    const keyword = keywordForDirection(r, '正位');
    host.innerHTML = `
      <article class="rune-result-card" data-density="full">
        <div class="rune-result-image"><img src="64images/${esc(r.圖檔名稱)}" alt="玄之符文" /></div>
        <div class="rune-result-body">
          <h2 class="rune-result-name">${esc(r.符文名稱)}${r.英文 ? `<small>${esc(r.英文)}</small>` : ''}</h2>
          <div class="rune-result-grid">
            <div class="rune-result-field"><span class="rune-result-label">卡片方向</span><span class="rune-result-value">正位</span></div>
            <div class="rune-result-field"><span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(keyword)}</span></div>
            <div class="rune-result-field"><span class="rune-result-label">所屬分組</span><span class="rune-result-value">特殊</span></div>
            <div class="rune-result-field moon"><span class="rune-result-label">卡片月相</span><span class="rune-result-value">${esc(r.月相 || '無')} / 真實月相：${esc(realPhase)}</span></div>
          </div>
        </div>
      </article>`;
  }

  function enhanceDrawCards(){
    document.querySelectorAll('#cards-grid .rune-result-card').forEach(card => {
      const nameNode = card.querySelector('.rune-result-name');
      const name = nameNode?.childNodes?.[0]?.textContent?.trim() || '';
      const runeRow = runeByName.get(name);
      if (!runeRow) return;

      const fields = [...card.querySelectorAll('.rune-result-field')];
      const directionField = fields.find(field => field.querySelector('.rune-result-label')?.textContent.trim() === '卡片方向');
      const directionName = directionField?.querySelector('.rune-result-value')?.textContent.trim() || '';

      if (directionField && !fields.some(field => field.querySelector('.rune-result-label')?.textContent.trim() === '關鍵詞')) {
        const keywordField = document.createElement('div');
        keywordField.className = 'rune-result-field';
        keywordField.innerHTML = `<span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(keywordForDirection(runeRow, directionName))}</span>`;
        directionField.after(keywordField);
      }

      const groupField = [...card.querySelectorAll('.rune-result-field')].find(field => field.querySelector('.rune-result-label')?.textContent.trim() === '所屬分組');
      const groupValue = groupField?.querySelector('.rune-result-value');
      if (groupValue && !groupValue.querySelector('a')) {
        const groupName = runeRow.所屬分組 || '';
        if (['靈魂','連結','生命','自然','礦物','元素','秩序','無序'].includes(groupName)) {
          groupValue.innerHTML = `<a class="rune-result-group-link" href="runes.html?group=${encodeURIComponent(groupName)}#library">${esc(groupName)}組</a>`;
        } else {
          groupValue.textContent = groupName === '特殊' || runeRow.編號 >= 65 ? '特殊' : groupName;
        }
      }
    });
  }

  renderRitualPreview();
  const cardsGrid = document.getElementById('cards-grid');
  if (cardsGrid) {
    new MutationObserver(enhanceDrawCards).observe(cardsGrid, { childList:true, subtree:true });
    enhanceDrawCards();
  }

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

    const quickItems = coreGroups.map(meta => ({
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
    }));

    const quickSelector = mountQuickSelector({
      target: quickHost,
      imageTarget: overviewLink,
      display: 'modal',
      items: quickItems,
      renderContent: item => {
        const ids = new Set(item.runeIds || []);
        const items = all.filter(r => ids.has(r.編號)).sort((a,b) => a.編號 - b.編號);
        return `<div class="group-row">${items.map(tile).join("")}</div>`;
      }
    });

    const requestedGroup = new URLSearchParams(location.search).get('group');
    if (requestedGroup && quickSelector) {
      const requestedItem = quickItems.find(item => item.label === requestedGroup || item.id === requestedGroup);
      if (requestedItem) setTimeout(() => quickSelector.select(requestedItem.id, true), 0);
    }
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