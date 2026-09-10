const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) moonText.textContent = `卡片月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "lots.html#draw"; });

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC（月典）是 lo3rwang 的數位思想資產與語言模組框架（Language Module Framework），用來提供跨尺度、跨領域的分類、組織、解析與推演參考。LunaRunes（月之符文）是其中一套實際運作的符號式語言系統。"
    );
  }

  const heroCopy = document.querySelector(".hero .loc-header-copy");
  if (heroCopy) {
    heroCopy.textContent = "LOC（月典，Luna Codex）是 lo3rwang 的數位思想資產與語言模組框架（Language Module Framework），用來整理長期累積的分類方式、語言結構、符文系統、脈絡判讀、演算法與推演方法。";
  }

  const heroNoteStrong = document.querySelector(".hero-note strong");
  if (heroNoteStrong) heroNoteStrong.textContent = "月之符文是 LOC 的實際驗證系統之一，也是目前最完整的符號式語言實作。";

  const runeEyebrow = document.querySelector("#rune-entry .rune-entry-eyebrow");
  if (runeEyebrow) runeEyebrow.textContent = "LunaRunes · 月之符文";

  const runeSectionLead = document.querySelector("#rune-entry .section-heading > p");
  if (runeSectionLead) {
    runeSectionLead.textContent = "月之符文由 66 個中文單一字構成，透過四向、月相與多卡語法形成可組合、可判讀的符號式語言系統。可以從一個問題開始，也可以沒有問題直接抽取。";
  }

  const runeIntro = document.querySelector("#rune-entry .rune-intro");
  if (runeIntro) {
    runeIntro.innerHTML = "<strong>不知道怎麼說，也沒關係。</strong>LunaRunes 可以成為語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。";
  }

  // Homepage rune cards use the current runes66 schema only.
  // Do not read legacy runes64 aliases, Spec, manifestation, history or extension fields here.
  const attributes = document.getElementById("attributes");
  const runeImage = document.getElementById("rune-image");

  const runeStyleId = "home-rune66-text-style";
  if (!document.getElementById(runeStyleId)) {
    const style = document.createElement("style");
    style.id = runeStyleId;
    style.textContent = `
      #attributes .rune66-kicker{display:block;color:var(--loc-purple);font-size:.72rem;font-weight:900;letter-spacing:.12em;line-height:1.35}
      #attributes .rune66-title{display:block;margin-top:4px;color:var(--loc-gold);font-size:1.18rem;font-weight:850;line-height:1.35}
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
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("Current runes66 schema must be a JSON array");
      const row = rows.find(item => Number(item?.編號) === runeId);
      if (!row) throw new Error(`Rune ${runeId} not found`);

      const id = Number(row.編號);
      const name = row.符文名稱 ?? "";
      const english = row.英文 ?? "";
      const group = row.所屬分組 ?? "";
      const phase = row.月相 ?? "無";
      const attribute = row.卡片屬性 ?? "";
      const keywords = row.關鍵詞 ?? "";
      const image = id && name ? `${String(id).padStart(2, "0")}_${name}.png` : "";

      if (runeImage && image) {
        runeImage.src = `64images/${image}`;
        runeImage.alt = `${name}之符文`;
      }

      attributes.innerHTML = `
        <span class="rune66-kicker">${escapeHtml(english)}</span>
        <strong class="rune66-title">${escapeHtml(name)}之符文</strong>
        <div class="rune66-details">
          ${keywords ? `<p class="rune66-detail"><strong>關鍵詞：</strong>${escapeHtml(keywords)}</p>` : ""}
          ${group ? `<p class="rune66-detail"><strong>所屬分組：</strong>${escapeHtml(group)}</p>` : ""}
          ${attribute ? `<p class="rune66-detail"><strong>卡片屬性：</strong>${escapeHtml(attribute)}</p>` : ""}
          <p class="rune66-detail"><strong>卡片月相：</strong>${escapeHtml(phase || "無")} / <strong>真實月相：</strong>${escapeHtml(realPhase)}</p>
        </div>
        <a class="rune-data-cta" href="lots.html#library">
          <span>
            <strong>查看完整月之符文資料</strong>
            <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
          </span>
          <span aria-hidden="true">→</span>
        </a>
      `;
    } catch (error) {
      console.error("Failed to render homepage rune from current runes66.json", error);
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
    evolutionLead.textContent = "LunaRunes 以符文系統為基礎，進入脈絡與不同表達體系，再由演算法形成可重複規則、由模組整合功能，最後放回時間中持續推演。";
  }

  const evolutionSteps = [...document.querySelectorAll("#language-evolution .evolution-step")];
  const evolutionContent = [
    { english: "LunaRunes", title: "月之符文", copy: "LunaRunes 由 66 個月之符文、四向、月相與組合語法構成，作為 LOC 的實際符號式語言系統與驗證基底。" },
    { english: "Context", title: "脈絡", copy: "把符文、作品、事件與概念放進關係、情境與脈絡圖（Graph）中，形成可觀察、可互動的語言脈絡。" },
    { english: "Music", title: "音樂", copy: "讓語言進入歌曲、歌詞、曲風與聲音；作品保留自己的內容與資料關係。" },
    { english: "Literary", title: "文字創作", copy: "讓語言進入小說、文章與其他文字作品，保留來源、版本與改寫關係。" },
    { english: "Multimedia", title: "多媒體", copy: "整合文字、音樂、圖像、影音與其他媒介，形成跨格式的語言資料。" },
    { english: "Algorithm", title: "演算法", copy: "把判讀、比較、治理、組合與分析方法整理成可重複執行、可檢查的規則與流程。" },
    { english: "Module", title: "演算模組", copy: "把演算法、資料、知識與功能封裝成可組合、可重用、可替換的語言模組。" },
    { english: "Evolution", title: "推演引擎", copy: "把多元體系、方法論、演算法與知識庫模組整理為可觀察的語言模型，再放回時間中比較與推演。" }
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
    frameworkCopy.textContent = "LOC 是語言模組框架（Language Module Framework）；八個模組分別為 LunaRunes、Context、Music、Literary、Multimedia、Algorithm、Module 與 Evolution。";
  }

  const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
  if (aboutCopy) {
    aboutCopy.textContent = "月典最初從 LunaRunes（月之符文）開始，之後逐步形成脈絡、音樂、文字創作、多媒體、演算法、演算模組與時間中的推演。LOC 與 LunaRunes 相輔相成、互相驗證。";
  }

  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes", title: "月之符文模組", tab: "月之符文模組", category: "月之符文",
      copy: "LunaRunes（月之符文）以 66 個月之符文為基本符號，透過四向、月相與不同抽牌結構形成可組合、可判讀的符號式語言系統。",
      extra: ["66 個月之符文構成固定骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。","LOC 幫 LunaRunes 結構化；LunaRunes 幫 LOC 實證。"]
    },
    LOC2: {
      english: "Context", title: "脈絡", tab: "脈絡", category: "脈絡",
      copy: "處理彼此怎麼連。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡。",
      extra: ["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","脈絡圖把大量內容與關係組成可觀察的整體。","脈絡沙盒遊戲是其中一種互動實作。"]
    },
    LOC3: {
      english: "Music", title: "音樂", tab: "音樂", category: "音樂（Suno）",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、可比較，也能和其他作品彼此連結的語言資料。",
      extra: ["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。"]
    },
    LOC4: {
      english: "Literary", title: "文字創作", tab: "文字創作", category: "文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品。除了保存作品本身，也保留來源、版本、首次發表與後續改寫之間的關係。",
      extra: ["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。"]
    },
    LOC5: {
      english: "Multimedia", title: "多媒體", tab: "多媒體", category: "多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。",
      extra: ["包含圖像、短影音（Reels）、影片、音樂錄影帶（MV）與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。"]
    },
    LOC6: {
      english: "Algorithm", title: "演算法", tab: "演算法", category: "演算法",
      copy: "把怎麼理解、怎麼判讀、怎麼比較、怎麼處理整理成可以重複執行、可以檢查的規則與流程。",
      extra: ["整理判讀、比較、治理與分析時可重複使用的規則。","月之符文在此對應符文演算法。","演算法描述如何處理，不等於單一價值答案。"]
    },
    LOC7: {
      english: "Module", title: "演算模組", tab: "演算模組", category: "演算模組",
      copy: "把演算法、資料、知識與功能封裝成可以組合、重用與替換的系統單元。",
      extra: ["模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","模組內可以使用一個或多個演算法。","實作技術可以更換，不改變 LOC 的框架層級。"]
    },
    LOC8: {
      english: "Evolution", title: "推演引擎", tab: "推演引擎", category: "推演",
      copy: "把多元體系、方法論、演算法與知識庫模組整理為可觀察的語言模型，再放回時間、時期、軌跡與趨勢中比較與推演。",
      extra: ["時期用來區分相對穩定的狀態。","時間線整理事件與作品出現的位置。","趨勢比較不同時期的語言與作品變化。","軌跡描述一路如何從一個狀態走到下一個狀態。","推演建立在既有資料上，不等於預言。"]
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

  if (modalTitle) modalTitle.innerHTML = '<span class="text-block-kicker">ARCHITECTURE</span><span class="text-block-title">快速說明</span>';

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