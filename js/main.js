const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "runes.html#draw"; });

  // Canon model hierarchy:
  // LOC = Evolvable Language System Model
  // LOC1–8 = Module Structure of the Language System Model
  // LOC1 = LunaRunes Module
  // LunaRunes = Symbolic Language Model
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC（月典）是一套分析拆解、組織彙整、搜尋並推演語言的可進化語言系統模型（Language System Model）。LOC1–LOC8 是語言系統模型（Model）的相關模組架構（Module Structure）。月之符文（LunaRunes）從語彙單字（Token）出發，與 LOC 相輔相成，最後進化為符號式語言模型（Symbolic Language Model）。"
    );
  }

  const heroSubtitle = document.querySelector(".hero .loc-header-subtitle");
  if (heroSubtitle) {
    heroSubtitle.textContent = "從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。";
  }

  const heroCopy = document.querySelector(".hero .loc-header-copy");
  if (heroCopy) {
    heroCopy.textContent = "月典是一套用來分析、整理、搜尋與推演語言的系統。它從月之符文開始，把文字、作品、脈絡與時間串起來，讓累積的資料可以繼續被理解、比較與推演。";
  }

  const heroNote = document.querySelector(".hero-note");
  if (heroNote) {
    heroNote.innerHTML = `<div class="moon" aria-hidden="true"></div>
      <strong>月之符文是種子，但不是使用門檻。</strong>
      <p>不必先知道或學會所有符文，也不用先會解牌，更不需要先理解什麼是語言系統。你可以先抽牌、找作品、看脈絡分析、看關鍵字排行；想深入時，LOC 再把其模組架構展開給你。</p>`;
  }

  const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
  if (startCopy) {
    startCopy.textContent = "完全的新手可以看「新手教學」。第一次使用可直接抽取每日符文。想查月之符文資料可進入「月之符文」。想理解整體則查看「LOC1–8 模組架構」。";
  }
  document.querySelectorAll('a[href="#framework-map"]').forEach(link => {
    if (link.textContent.includes("LOC")) link.textContent = "LOC1–8 模組架構";
  });

  const runeEyebrow = document.querySelector("#rune-entry .rune-entry-eyebrow");
  if (runeEyebrow) runeEyebrow.textContent = "LOC1 · LunaRunes Module · 月之符文語言模組";

  const runeTitle = document.querySelector("#rune-entry #rune-title");
  if (runeTitle) runeTitle.textContent = "問一件事，或讓語言自己推演成長，最後讓你選擇成為什麼樣子。";

  const runeSectionLead = document.querySelector("#rune-entry .section-heading > p");
  if (runeSectionLead) {
    runeSectionLead.textContent = "直接從一個問題開始，選擇想要的抽取方式，讓月之符文提供一個新的語言起點，它將會推演出一個實用的指示。";
  }

  const runeIntro = document.querySelector("#rune-entry .rune-intro");
  if (runeIntro) {
    runeIntro.innerHTML = "<strong>月之符文由基本語彙（Token）出發。</strong>進入關係脈絡分析（Context），並與占卜使用的演算法模組及 LOC 其他模組相輔相成，最後進化為符號式語言模型（Symbolic Language Model）。";
  }

  const attributes = document.getElementById("attributes");
  const runeImage = document.getElementById("rune-image");

  const runeStyleId = "home-rune66-text-style";
  if (!document.getElementById(runeStyleId)) {
    const style = document.createElement("style");
    style.id = runeStyleId;
    style.textContent = `
      #attributes .rune66-kicker{display:block;color:var(--loc-purple);font-size:.72rem;font-weight:900;letter-spacing:.12em;line-height:1.35}
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
        <span class="rune66-kicker">${escapeHtml(String(english))}</span>
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
    evolutionLead.textContent = "從語彙開始，延伸出文字創作與多元體系；它們在脈絡中彼此連結，透過演算法整合，並在時間中持續推演。";
  }

  const evolutionSteps = [...document.querySelectorAll("#language-evolution .evolution-step")];
  const evolutionContent = [
    { english: "LunaRunes Module", title: "月之符文語言模組", copy: "LOC1 對應月之符文。LunaRunes 從基本語彙（Token）出發，作為符文語言與互動的起點。" },
    { english: "Context", title: "脈絡", copy: "LOC2 對應符文脈絡，把符文、作品、事件與概念放進關係、情境與關係圖（Graph）中。" },
    { english: "Music", title: "音樂", copy: "LOC3 對應較基礎的符文體系，可用三卡結構作為複雜度類比；目前主要音樂實作來源為 Suno。" },
    { english: "Literary", title: "文字創作", copy: "LOC4 對應更完整的符文體系，可用五卡結構作為複雜度類比，承接小說、文章與其他文字作品。" },
    { english: "Multimedia", title: "多媒體", copy: "LOC5 對應多模組整合的符文體系，可用 OW3gs 結構作為複雜度類比，整合文字、音樂、圖像與影音。" },
    { english: "Algorithm", title: "演算法", copy: "LOC6 對應符文演算法，把判讀、比較、治理、組合與分析方法整理成可重複執行、可檢查的規則與流程。" },
    { english: "Module", title: "演算模組", copy: "LOC7 對應符文模組，把演算法、資料、知識與功能封裝成可組合、重用與替換的演算模組。" },
    { english: "Evolution", title: "推演引擎", copy: "LOC8 對應符文演化，把模型、模組、作品、事件與語言放回時間中觀察，推演可能方向，累積後再選擇是否進化。" }
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
    aboutCopy.textContent = "從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演；系統根據累積資料提出演化方向，再由使用者選擇是否進化。月之符文由基本語彙（Token）出發，進入關係脈絡分析（Context）與占卜使用的演算法模組，並與 LOC 相輔相成，最後進化為符號式語言模型（Symbolic Language Model）。";
  }

  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes Module", title: "月之符文語言模組", tab: "月之符文語言模組", category: "月之符文",
      copy: "LOC1 是 LunaRunes Module（月之符文語言模組）。LunaRunes 從 66 個中文單字（Token）出發，透過四向、月相與不同抽牌結構形成可組合、可判讀的語言，並與 LOC 其他模組相輔相成，進化為符號式語言模型（Symbolic Language Model）。",
      extra: ["66 個月之符文構成固定語彙骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。","LunaRunes 是符號式語言模型；LOC1 是承載它的 LunaRunes Module。"]
    },
    LOC2: {
      english: "Context", title: "脈絡", tab: "脈絡", category: "符文脈絡",
      copy: "處理『彼此怎麼連』。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡。",
      extra: ["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","關係圖（Graph）把大量內容與關係組成可觀察的整體。","脈絡沙盒遊戲是其中一種互動實作。"]
    },
    LOC3: {
      english: "Music", title: "音樂", tab: "音樂", category: "符文體系（較基礎結構／三卡類比）",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、可比較，也能和其他作品彼此連結的語言資料。",
      extra: ["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。","曲風與既有標籤可以直接成為搜尋與統計資料。"]
    },
    LOC4: {
      english: "Literary", title: "文字創作", tab: "文字創作", category: "符文體系（更完整結構／五卡類比）",
      copy: "承接小說、文章、生活文字與其他文字作品。除了保存作品本身，也保留來源、版本、首次發表與後續改寫之間的關係。",
      extra: ["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。","文字作品可以進一步進入脈絡、搜尋與語意分析。"]
    },
    LOC5: {
      english: "Multimedia", title: "多媒體", tab: "多媒體", category: "符文體系（多模組整合／OW3gs 類比）",
      copy: "把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。",
      extra: ["包含圖像、短影音（Reels）、影片、音樂錄影帶（MV）與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。","不同媒介可以共享標籤、脈絡與語意關係。"]
    },
    LOC6: {
      english: "Algorithm", title: "演算法", tab: "演算法", category: "符文演算法",
      copy: "把『怎麼理解、怎麼判讀、怎麼比較、怎麼處理』整理成可以重複執行、可以檢查的規則與流程。",
      extra: ["整理判讀、比較、治理與分析時可重複使用的規則。","演算法描述如何處理，不等於單一價值答案。","成熟演算法可以交由 LOC7 封裝成演算模組。"]
    },
    LOC7: {
      english: "Module", title: "演算模組", tab: "演算模組", category: "符文模組",
      copy: "把演算法、資料、知識與功能封裝成可以組合、重用與替換的演算模組。",
      extra: ["演算模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","一個演算模組內可以使用一個或多個演算法。","LOC7 處理的是演算法如何被封裝與組合，不等於 LOC1–LOC8 的總稱。"]
    },
    LOC8: {
      english: "Evolution", title: "推演引擎", tab: "推演引擎", category: "符文演化",
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
      #framework-modal-title .text-block-kicker,.framework-detail .kicker{display:block;color:var(--loc-purple);font-size:.72rem;font-weight:900;letter-spacing:.1em;line-height:1.35}
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
