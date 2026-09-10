const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "runes.html#draw"; });

  // Canon model hierarchy:
  // LOC = Evolvable Language System Model
  // LOC1–8 = Language System Modules
  // LOC1 = LunaRunes Module
  // LunaRunes = Symbolic Language Model
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC（月典）是一套分析拆解、組織彙整、搜尋並推演語言的可進化語言系統模型（Language System Model）。LOC1–LOC8 是語言系統模型（Model）的相關模組架構（Module Structure）。月之符文（LunaRunes）從語彙單字（Token）出發，與 LOC 相輔相成，最後進化為符號式語言模型（Symbolic Language Model）。"
    );
  }

  const heroCopy = document.querySelector(".hero .loc-header-copy");
  if (heroCopy) {
    heroCopy.textContent = "從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，自我選擇演化，累積後便可以進化。月典（LOC，Luna Codex）是一套分析拆解、組織彙整、搜尋並推演語言的可自動進化語言模型。它以月之符文作為語彙（Token）的種子，經過脈絡分析、創作文字與延伸體系、整合規則的演算法模組，最後放回時間中觀察，並在推演演化後選擇進化。";
  }

  const heroNoteStrong = document.querySelector(".hero-note strong");
  if (heroNoteStrong) heroNoteStrong.textContent = "LOC 為可進化的語言系統模型；LOC1–LOC8 是語言系統模型（Model）的相關模組架構（Module Structure）。";

  const runeEyebrow = document.querySelector("#rune-entry .rune-entry-eyebrow");
  if (runeEyebrow) runeEyebrow.textContent = "LOC1 · LunaRunes Module · 月之符文語言模組";

  const runeSectionLead = document.querySelector("#rune-entry .section-heading > p");
  if (runeSectionLead) {
    runeSectionLead.textContent = "月之符文由基本語彙（Token）出發，進入關係脈絡分析（Context），並與占卜使用的演算法模組及 LOC 其他模組相輔相成，逐步成長為一套符號式語言模型（Symbolic Language Model）。";
  }

  const runeIntro = document.querySelector("#rune-entry .rune-intro");
  if (runeIntro) {
    runeIntro.innerHTML = "<strong>月之符文是種子，但不是使用門檻。</strong>不必先學會所有符文、解牌方式或語言系統。你可以先抽牌、找作品、看脈絡分析或關鍵字排行；想深入時，LOC 再把模組架構展開給你。";
  }

  // Homepage rune text must come from the canonical runes66 dataset, not from
  // legacy hard-coded fields in index.html.
  const attributes = document.getElementById("attributes");
  const runeImage = document.getElementById("rune-image");

  const runeStyleId = "home-rune66-text-style";
  if (!document.getElementById(runeStyleId)) {
    const style = document.createElement("style");
    style.id = runeStyleId;
    style.textContent = `
      #attributes .rune66-kicker{display:block;color:var(--loc-purple);font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;line-height:1.35}
      #attributes .rune66-title{display:block;margin-top:4px;color:var(--loc-gold);font-size:1.18rem;font-weight:850;line-height:1.35}
      #attributes .rune66-spec{margin:10px 0 0;color:var(--loc-text);font-size:.9rem;line-height:1.65}
      #attributes .rune66-details{display:grid;gap:5px;margin-top:12px;padding-top:12px;border-top:1px solid var(--loc-border)}
      #attributes .rune66-detail{margin:0;color:var(--loc-muted);font-size:.78rem;line-height:1.5}
      #attributes .rune66-detail strong{color:var(--loc-text);font-weight:800}
    `;
    document.head.appendChild(style);
  }

  async function renderHomepageRune66(runeId = 65) {
    if (!attributes) return;
    try {
      const response = await fetch("data/json/core/runes66.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);
      const row = rows.find(item => Number(item?.編號 ?? item?.id) === runeId);
      if (!row) throw new Error(`Rune ${runeId} not found`);

      const id = Number(row.編號 ?? row.id);
      const name = row.符文名稱 ?? row.名稱 ?? row.name ?? "";
      const english = row.英文 ?? row.english ?? "";
      const group = row.所屬分組 ?? row.group ?? "";
      const phase = row.月相 ?? row.moon_phase ?? "無";
      const attribute = row.卡片屬性 ?? row.card_attribute ?? "";
      const manifestation = row.顯化形式 ?? "";
      const keywords = row.關鍵詞 ?? row.keyword ?? "";
      const spec = row.spec ?? "";
      const image = row.image ?? row.圖檔名稱 ?? (id && name ? `${String(id).padStart(2, "0")}_${name}.png` : "");

      if (runeImage && image) {
        runeImage.src = image.includes("/") ? image : `64images/${image}`;
        runeImage.alt = `${name}之符文`;
      }

      attributes.innerHTML = `
        <span class="rune66-kicker">${escapeHtml(String(english).toUpperCase())}</span>
        <strong class="rune66-title">${escapeHtml(name)}之符文</strong>
        ${spec ? `<p class="rune66-spec">${escapeHtml(spec)}</p>` : ""}
        <div class="rune66-details">
          ${manifestation ? `<p class="rune66-detail"><strong>顯化形式：</strong>${escapeHtml(manifestation)}</p>` : ""}
          ${keywords ? `<p class="rune66-detail"><strong>關鍵詞：</strong>${escapeHtml(keywords)}</p>` : ""}
          ${group ? `<p class="rune66-detail"><strong>所屬分組：</strong>${escapeHtml(group)}</p>` : ""}
          ${attribute ? `<p class="rune66-detail"><strong>卡片屬性：</strong>${escapeHtml(attribute)}</p>` : ""}
          <p class="rune66-detail"><strong>月相：</strong>${escapeHtml(phase || "無")} / <strong>真實月相：</strong>${escapeHtml(realPhase)}</p>
        </div>
        <a class="rune-data-cta" href="runes.html#library">
          <span>
            <strong>查看完整月之符文資料</strong>
            <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
          </span>
          <span aria-hidden="true">→</span>
        </a>
      `;
    } catch (error) {
      console.error("Failed to render homepage rune from runes66.json", error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  renderHomepageRune66(65);

  const evolutionLead = document.querySelector("#language-evolution .section-heading > p");
  if (evolutionLead) {
    evolutionLead.textContent = "月之符文從語彙單字（Token）出發，經過脈絡、創作與延伸體系、演算法與演算模組，最後交由推演引擎放回時間中觀察、推演與累積，形成可以持續進化的語言模型。";
  }

  const evolutionSteps = [...document.querySelectorAll("#language-evolution .evolution-step")];
  const evolutionContent = [
    { english: "LunaRunes Module", title: "月之符文語言模組", copy: "LOC1 承載 LunaRunes 的語彙與互動入口；月之符文從中文單字（Token）出發，逐步發展為符號式語言模型（Symbolic Language Model）。" },
    { english: "Context", title: "脈絡", copy: "把符文、作品、事件與概念放進關係、情境與關係圖（Graph）中，形成可觀察、可互動的語言脈絡。" },
    { english: "Music", title: "音樂", copy: "讓語言進入歌曲、歌詞、曲風與聲音；目前主要音樂實作來源為 Suno。" },
    { english: "Literary", title: "文字創作", copy: "讓語言進入小說、文章與其他文字作品，保留作品、版本與語意之間的關係。" },
    { english: "Multimedia", title: "多媒體", copy: "整合文字、音樂、圖像、影音與其他媒介，形成跨媒介的語言延伸體系。" },
    { english: "Algorithm", title: "演算法", copy: "把判讀、比較、治理、組合與分析方法整理成可重複執行、可檢查的規則與流程。" },
    { english: "Module", title: "演算模組", copy: "把演算法、資料、知識與功能封裝成可組合、重用與替換的演算模組。" },
    { english: "Evolution", title: "推演引擎", copy: "把模型、模組、作品、事件與語言放回時間、時期、軌跡與趨勢中觀察，推演可能方向，累積後再選擇是否進化。" }
  ];

  evolutionSteps.forEach((step, index) => {
    const item = evolutionContent[index];
    if (!item) return;
    const english = step.querySelector("small.text-category");
    const title = step.querySelector("strong.text-title");
    const copy = step.querySelector("p");
    if (english) english.textContent = item.english;
    if (title) title.textContent = item.title;
    if (copy) copy.textContent = item.copy;
  });

  const frameworkCopy = document.querySelector("#framework-map .loc-header-copy");
  if (frameworkCopy) {
    frameworkCopy.textContent = "LOC 為可進化的語言系統模型；LOC1–LOC8 是語言系統模型（Model）的相關模組架構（Module Structure）：LunaRunes Module、Context、Music、Literary、Multimedia、Algorithm、Module 與 Evolution。";
  }

  const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
  if (aboutCopy) {
    aboutCopy.textContent = "從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演；系統根據累積資料提出演化方向，再由使用者選擇是否進化。月之符文作為最初的語彙種子，與 LOC 各模組相輔相成，最後成長為符號式語言模型（Symbolic Language Model）。";
  }

  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes Module", title: "月之符文語言模組", tab: "月之符文語言模組", category: "月之符文語言模組",
      copy: "LOC1 是 LunaRunes Module（月之符文語言模組）。LunaRunes 從 66 個中文單字（Token）出發，透過四向、月相與不同抽牌結構形成可組合、可判讀的語言，並與 LOC 其他模組相輔相成，逐步成長為符號式語言模型（Symbolic Language Model）。",
      extra: ["66 個月之符文構成固定語彙骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。","LunaRunes 是符號式語言模型；LOC1 是承載它的 LunaRunes Module。"]
    },
    LOC2: {
      english: "Context", title: "脈絡", tab: "脈絡", category: "脈絡（關係圖）",
      copy: "處理『彼此怎麼連』。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡。",
      extra: ["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","關係圖（Graph）把大量內容與關係組成可觀察的整體。","脈絡沙盒遊戲是其中一種互動實作。"]
    },
    LOC3: {
      english: "Music", title: "音樂", tab: "音樂", category: "音樂（Suno）",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、可比較，也能和其他作品彼此連結的語言資料。",
      extra: ["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。","曲風與既有標籤可以直接成為搜尋與統計資料。"]
    },
    LOC4: {
      english: "Literary", title: "文字創作", tab: "文字創作", category: "文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品。除了保存作品本身，也保留來源、版本、首次發表與後續改寫之間的關係。",
      extra: ["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。","文字作品可以進一步進入脈絡、搜尋與語意分析。"]
    },
    LOC5: {
      english: "Multimedia", title: "多媒體", tab: "多媒體", category: "多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。",
      extra: ["包含圖像、短影音（Reels）、影片、音樂錄影帶（MV）與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。","不同媒介可以共享標籤、脈絡與語意關係。"]
    },
    LOC6: {
      english: "Algorithm", title: "演算法", tab: "演算法", category: "演算法",
      copy: "把『怎麼理解、怎麼判讀、怎麼比較、怎麼處理』整理成可以重複執行、可以檢查的規則與流程。",
      extra: ["整理判讀、比較、治理與分析時可重複使用的規則。","演算法描述如何處理，不等於單一價值答案。","成熟演算法可以交由 LOC7 封裝成演算模組。"]
    },
    LOC7: {
      english: "Module", title: "演算模組", tab: "演算模組", category: "演算模組",
      copy: "把演算法、資料、知識與功能封裝成可以組合、重用與替換的演算模組。",
      extra: ["演算模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","一個演算模組內可以使用一個或多個演算法。","LOC7 處理的是演算法如何被封裝與組合，不等於 LOC1–LOC8 的總稱。"]
    },
    LOC8: {
      english: "Evolution", title: "推演引擎", tab: "推演引擎", category: "推演引擎",
      copy: "處理『它在時間中怎麼改變』。把模型、模組、作品、事件與語言放回不同時期，觀察前後差異與變化方向，並根據累積結果提出可選擇的演化路徑。",
      extra: ["時期用來區分相對穩定的狀態。","時間線整理事件與作品出現的位置。","趨勢比較不同時期的語言與作品變化。","推演提供演化方向；最終是否進化仍由使用者選擇。"]
    }
  };

  const modalTitle = document.getElementById("framework-modal-title");
  const tabs = document.getElementById("framework-tabs");
  const kicker = document.getElementById("framework-detail-kicker");
  const title = document.getElementById("framework-detail-title");
  const copy = document.getElementById("framework-detail-copy");
  const extra = document.getElementById("framework-detail-extra");

  const styleId = "loc-framework-text-block-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #framework-modal-title .text-block-kicker,.framework-detail .kicker{display:block;color:var(--loc-purple);font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;line-height:1.35}
      #framework-modal-title .text-block-title{display:block;margin-top:4px;color:var(--loc-gold);font-size:1.18rem;font-weight:850;line-height:1.35}
      .framework-detail h3{color:var(--loc-gold);font-size:1.18rem;font-weight:850;line-height:1.35}
      .framework-tabs[data-ui-role="tags"]{margin-top:16px;padding:14px 0 0;border-top:1px solid var(--loc-border)}
    `;
    document.head.appendChild(style);
  }

  if (modalTitle) modalTitle.innerHTML = '<span class="text-block-kicker">Architecture</span><span class="text-block-title">快速說明</span>';

  if (tabs) {
    const detail = copy?.closest(".framework-detail");
    if (detail) detail.appendChild(tabs);
    tabs.setAttribute("aria-label", "分類");
    tabs.setAttribute("data-ui-role", "tags");
  }

  document.querySelectorAll(".framework-tab").forEach(btn => {
    const item = frameworkInfo[btn.dataset.locKey];
    if (item) btn.textContent = item.tab;
  });

  document.querySelectorAll("[data-loc-open]").forEach(btn => {
    const item = frameworkInfo[btn.dataset.locOpen];
    if (item) {
      btn.textContent = item.tab;
      btn.setAttribute("aria-label", `查看${item.tab}說明`);
    }
  });

  function applyFrameworkInfo(key) {
    const item = frameworkInfo[key] || frameworkInfo.LOC1;
    if (kicker) kicker.textContent = item.english;
    if (title) title.textContent = item.title;
    if (copy) copy.textContent = item.copy;
    if (extra) {
      const details = (item.extra || []).map(text => `<li>${text}</li>`).join("");
      extra.innerHTML = `<li><strong>分類：</strong>${item.category}</li>${details}`;
    }
  }

  document.querySelectorAll(".framework-tab").forEach(btn => btn.addEventListener("click", () => applyFrameworkInfo(btn.dataset.locKey)));
  document.querySelectorAll("[data-loc-open]").forEach(btn => btn.addEventListener("click", () => applyFrameworkInfo(btn.dataset.locOpen)));
  applyFrameworkInfo("LOC1");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.info("Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
