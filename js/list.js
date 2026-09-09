document.addEventListener("DOMContentLoaded", async () => {
  const drawable = (window.getRunes66?.() || [])
    .filter(r => r && Number(r.編號) >= 1 && Number(r.編號) <= 66)
    .sort((a,b) => Number(a.編號) - Number(b.編號));

  let deRune = null;
  try {
    const response = await fetch("data/json/core/runes66.json");
    if (response.ok) {
      const payload = await response.json();
      const de = (payload.runes || []).find(r => Number(r.id) === 0);
      if (de) {
        deRune = {
          編號: 0,
          名稱: de.name,
          符文名稱: de.name,
          英文: de.english,
          圖騰: de.icon || "",
          顯化形式: de.keyword || "作者誌銘・治理・集合",
          關鍵詞: de.keyword || "",
          所屬分組: de.group || "治理",
          月相: de.moon_phase || "不適用",
          解牌基本極性: de.card_attribute || "中立",
          Spec: de.spec || "",
          符文變化歷史: de.history?.符文變化歷史 || "",
          drawable: false,
          圖檔名稱: null
        };
      }
    }
  } catch (error) {
    console.warn("Rune 0 德資料載入失敗，66 枚可抽取符文仍可正常顯示。", error);
  }

  const all = deRune ? [deRune, ...drawable] : drawable;

  const grid = document.querySelector("#rune-grid");
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
        <span class="meta"><span class="pill">${esc(r.所屬分組)}</span><span class="pill">${esc(r.月相)}</span></span>
      </div>
    </article>`;
  }

  const groupOrder = ["靈魂","連結","生命","自然","礦物","元素","秩序","無序"];

  const groupProfiles = {
    "靈魂": {
      style: "哲學抽象／詩意",
      tone: "深邃、內觀、意識層次",
      note: "象徵意識與靈性記憶的源流，連結宇宙深處的回聲。",
      vector: "meta_self / consciousness"
    },
    "連結": {
      style: "詩意人際／原型導向",
      tone: "關係洞察、自我映照",
      note: "描繪人我之間的牽引與裂縫，通往理解與誤解的門扉。",
      vector: "relation / bridge"
    },
    "生命": {
      style: "感官體驗／實用",
      tone: "身心感受、日常節奏",
      note: "記錄生老病死的軌跡，是身心存在的呼吸與節奏。",
      vector: "emotive / somatic_self"
    },
    "自然": {
      style: "詩意自然觀／象徵",
      tone: "山林隱喻、季節循環",
      note: "取象於山林花草，承載天地循環與生命原始律動。",
      vector: "nature_cycle / organic_flow"
    },
    "礦物": {
      style: "實用導向／象徵",
      tone: "現實、建議性、穩固踏實",
      note: "沉靜如岩的記憶封印，蘊藏堅固、淬鍊與時間之力。",
      vector: "materiality / value_logic"
    },
    "元素": {
      style: "詩意型／感官體驗",
      tone: "情緒、能量、轉化",
      note: "由風火水光構成的原始能量，驅動情感與內在動力。",
      vector: "power_flux / transformation"
    },
    "秩序": {
      style: "哲學／命運導向",
      tone: "因果、宿命、天體規律",
      note: "代表秩序、因果與命運規律，引導混沌中的方向感。",
      vector: "order_time / causal_cosmos"
    },
    "無序": {
      style: "詩意型／混沌哲學",
      tone: "開放式問題、無邊界的敘述",
      note: "來自虛無與混亂的靈感源頭，蘊藏破壞與創造的契機。",
      vector: "mystery / ambiguity_query"
    }
  };

  function render(){
    const g = group.value;
    const filtered = all.filter(r => !g || r.所屬分組 === g);

    count.textContent = g ? `${filtered.length} / 66 可抽取符文` : `${all.length} 筆資料 · 66 枚可抽取符文`;

    if(!filtered.length){
      grid.innerHTML = '<div class="empty">沒有符合條件的符文。</div>';
      return;
    }

    const sections = [];
    const de = !g ? filtered.find(r => Number(r.編號) === 0) : null;
    if(de){
      sections.push(`<section class="rune-group" aria-label="第零符 德">
        <div class="group-head">
          <div class="group-title">
            <strong>第零符 · 德</strong>
            <div class="group-tone"><b>作者誌銘／治理錨點</b> · 不參與抽牌</div>
            <span class="group-note">德是 66 種符文的開始也是集合；用來留下作者／月語者的個人誌銘與治理起點。</span>
          </div>
          <span class="group-count">1 筆資料</span>
        </div>
        <div class="group-row">${tile(de)}</div>
      </section>`);
    }

    groupOrder.forEach(name => {
      const items = filtered.filter(r => r.所屬分組 === name && Number(r.編號) <= 64);
      if(items.length){
        const profile = groupProfiles[name];
        sections.push(`<section class="rune-group" aria-label="${esc(name)}組" data-vector="${esc(profile?.vector || "")}">
          <div class="group-head">
            <div class="group-title">
              <strong>${esc(name)}組</strong>
              <div class="group-tone"><b>${esc(profile?.style || "")}</b> · ${esc(profile?.tone || "")}</div>
              <span class="group-note">${esc(profile?.note || "")}</span>
            </div>
            <span class="group-count">${items.length} 張</span>
          </div>
          <div class="group-row">${items.map(tile).join("")}</div>
        </section>`);
      }
    });

    const special = filtered.filter(r => Number(r.編號) >= 65);
    if(special.length){
      sections.push(`<section class="rune-group" aria-label="特殊符文">
        <div class="group-head"><strong>特殊符文</strong><span>${special.length} 張</span></div>
        <div class="group-row">${special.map(tile).join("")}</div>
      </section>`);
    }

    grid.innerHTML = sections.join("");
  }

  const fields = [
    ["英文","英文"],["圖騰","圖騰"],["顯化形式","顯化形式"],["所屬分組","所屬分組"],["月相","月相"],
    ["月相輔助說明","月相輔助說明"],["靈魂咒語","靈魂咒語"],["靈魂課題","靈魂課題"],
    ["實踐挑戰","實踐挑戰"],["分組說明","分組說明"],["符文變化歷史","符文變化歷史"],
    ["神話故事","神話故事"],["配套儀式建議","配套儀式建議"],["能量調和建議","能量調和建議"]
  ];

  function openRune(r){
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
      '<span class="pill">作者誌銘</span>',
      '<span class="pill">治理錨點</span>',
      '<span class="pill">不參與抽牌</span>'
    ].join("") : [
      `<span class="pill">${esc(r.所屬分組)}</span>`,
      `<span class="pill">${esc(r.月相)}</span>`,
      `<span class="pill">${esc(r.顯化形式)}</span>`
    ].join("");
    const runeName = String(r.符文名稱 || "").trim();
    if(isDe){
      modalData.innerHTML = [
        ['英文', r.英文],
        ['定位', '作者／月語者個人誌銘；LOC 治理錨點'],
        ['抽取', '不參與 66 枚符文抽牌'],
        ['圖片', '無；第零符不是卡面'],
        ['基本定義', r.Spec],
        ['History', r.符文變化歷史]
      ].filter(([,value]) => value).map(([label,value]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
      modal.showModal();
      return;
    }
    const searchQuery = `尋找目前${runeName}之符文的資料`;
    const methodQuery = `符合${runeName}之符文演算法的文字`;
    const searchUrl = `search.html?q=${encodeURIComponent(runeName + "之符文")}`;
    const methodUrl = `search.html?content_type=rune_algorithm&q=${encodeURIComponent(methodQuery)}`;
    modalData.innerHTML = fields
      .filter(([,key]) => r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== "")
      .map(([label,key]) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(r[key])}</dd></div>`)
      .join("") +
      `<div class="field">
        <dt>延伸查看</dt>
        <dd>
          <a href="${searchUrl}">尋找目前「${esc(runeName)}」之符文的資料</a>
          <span aria-hidden="true"> · </span>
          <a href="${methodUrl}">尋找符合「${esc(runeName)}」之符文演算法的文字</a>
        </dd>
      </div>`;
    modal.showModal();
  }

  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-rune]");
    if(!btn) return;
    const r = all.find(x => Number(x.編號) === Number(btn.dataset.rune));
    if(r) openRune(r);
  });

  group.addEventListener("change", render);
  closeBtn.addEventListener("click", () => modal.close());
  modal.addEventListener("click", e => {
    if(e.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    modalImage.removeAttribute("src");
    modalImage.alt = "";
    modalImage.hidden = false;
  });

  render();
});