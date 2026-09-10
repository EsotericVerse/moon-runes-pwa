const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "runes.html#draw"; });

  // Canon model hierarchy:
  // LOC = Language System Model
  // LOC1–8 = Language System Modules
  // LunaRunes = Symbolic Language Model
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC（月典）是一套由八個語言系統模組組合而成的語言系統模型；LunaRunes（月之符文）是其中可實際運作的符號式語言模型。LOC1–8涵蓋月之符文、脈絡、音樂、文字創作、多媒體、演算法、模組與推演。"
    );
  }

  const heroCopy = document.querySelector(".hero .loc-header-copy");
  if (heroCopy) {
    heroCopy.textContent = "月典（LOC，Luna Codex）是一套分析拆解、組織彙整、搜尋並推演語言的語言系統模型（Language System Model），由 LOC1–LOC8 八個語言系統模組（Language System Modules）組合而成。LunaRunes（月之符文）是 LOC1 的符號式語言模型（Symbolic Language Model），並可由脈絡、作品、演算法、模組與時間推演持續延伸。";
  }

  const heroNoteStrong = document.querySelector(".hero-note strong");
  if (heroNoteStrong) heroNoteStrong.textContent = "月之符文是符號式語言模型，也是 LOC 的起點，但不是使用門檻。";

  const runeEyebrow = document.querySelector("#rune-entry .rune-entry-eyebrow");
  if (runeEyebrow) runeEyebrow.textContent = "LunaRunes · Symbolic Language Model · 月之符文";

  const runeSectionLead = document.querySelector("#rune-entry .section-heading > p");
  if (runeSectionLead) {
    runeSectionLead.textContent = "月之符文由 66 個中文單一字構成，透過四向、月相與多卡語法形成可組合、可判讀的符號式語言模型。可以從一個問題開始，也可以沒有問題直接抽取。";
  }

  const runeIntro = document.querySelector("#rune-entry .rune-intro");
  if (runeIntro) {
    runeIntro.innerHTML = "<strong>不知道怎麼說，也沒關係。</strong>LunaRunes 可以成為語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。";
  }

  const evolutionLead = document.querySelector("#language-evolution .section-heading > p");
  if (evolutionLead) {
    evolutionLead.textContent = "LunaRunes 以符號式語言模型為基礎，進入脈絡與不同表達體系，再由演算法形成可重複規則、由模組整合功能，最後放回時間中持續推演。";
  }

  const evolutionSteps = [...document.querySelectorAll("#language-evolution .evolution-step")];
  const evolutionContent = [
    {
      english: "LunaRunes",
      title: "月之符文",
      copy: "LunaRunes 是由 66 個月之符文、四向、月相與組合語法構成的符號式語言模型（Symbolic Language Model）。"
    },
    {
      english: "Context",
      title: "符文脈絡",
      copy: "把符文、作品、事件與概念放進關係、情境與脈絡圖（Graph）中，形成可觀察、可互動的語言脈絡。"
    },
    {
      english: "Music",
      title: "音樂",
      copy: "讓語言進入歌曲、歌詞、曲風與聲音；在符文系統的結構類比中，可視為較基礎的符文體系／三卡結構。"
    },
    {
      english: "Literary",
      title: "文字創作",
      copy: "讓語言進入小說、文章與其他文字作品；在符文系統的結構類比中，可視為更完整的符文體系／五卡結構。"
    },
    {
      english: "Multimedia",
      title: "多媒體",
      copy: "整合文字、音樂、圖像、影音與其他媒介；在符文系統的結構類比中，可視為多模組整合／OW3gs 結構。"
    },
    {
      english: "Algorithm",
      title: "演算法",
      copy: "把判讀、比較、治理、組合與分析方法整理成可重複執行、可檢查的規則與流程；月之符文在此對應符文演算法。"
    },
    {
      english: "Module",
      title: "模組",
      copy: "把演算法、資料、知識與功能封裝並組合成可重用的語言系統模組；LOC1–LOC8 本身就是構成 LOC 模型的八個模組。"
    },
    {
      english: "Evolution",
      title: "推演",
      copy: "把模型、模組、作品、事件與語言放回時間、時期、軌跡與趨勢中觀察變化，形成符文演化與系統推演。"
    }
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
    frameworkCopy.textContent = "LOC 是整體語言系統模型（Language System Model）；LOC1–LOC8 是構成模型的八個語言系統模組（Language System Modules）：LunaRunes、Context、Music、Literary、Multimedia、Algorithm、Module 與 Evolution。";
  }

  const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
  if (aboutCopy) {
    aboutCopy.textContent = "月典最初從 LunaRunes（月之符文）這套符號式語言模型開始，之後逐步形成脈絡、音樂、文字創作、多媒體、演算法、模組與時間中的推演。LOC 不是單一模組，而是由 LOC1–LOC8 八個語言系統模組共同構成的語言系統模型。";
  }

  // Canon presentation rule:
  // English kicker -> Chinese gold title -> reader-facing Chinese explanation -> details -> tags last.
  // Engineering vocabulary is kept out of the public quick explanation unless it is necessary to the concept.
  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes", title: "月之符文", tab: "月之符文", category: "月之符文（符文籤詩 Lots）",
      copy: "LunaRunes（月之符文）是一套符號式語言模型（Symbolic Language Model）。它以 66 個月之符文為基本符號，透過四向、月相與不同抽牌結構形成可組合、可判讀的語言。",
      extra: ["66 個月之符文構成固定骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。","月之符文是 LOC 的起點，但 LOC 整體並不等於月之符文。"]
    },
    LOC2: {
      english: "Context", title: "脈絡", tab: "脈絡", category: "脈絡（關係圖）",
      copy: "處理『彼此怎麼連』。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡；在月之符文中對應符文脈絡。",
      extra: ["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","脈絡圖把大量內容與關係組成可觀察的整體。","脈絡沙盒遊戲是其中一種互動實作。"]
    },
    LOC3: {
      english: "Music", title: "音樂", tab: "音樂", category: "音樂（Suno）",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、可比較，也能和其他作品彼此連結的語言資料。",
      extra: ["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。","在月之符文的結構類比中，可對應較基礎的符文體系／三卡結構。"]
    },
    LOC4: {
      english: "Literary", title: "文字創作", tab: "文字創作", category: "文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品。除了保存作品本身，也保留來源、版本、首次發表與後續改寫之間的關係。",
      extra: ["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。","在月之符文的結構類比中，可對應更完整的符文體系／五卡結構。"]
    },
    LOC5: {
      english: "Multimedia", title: "多媒體", tab: "多媒體", category: "多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。",
      extra: ["包含圖像、短影音（Reels）、影片、音樂錄影帶（MV）與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。","在月之符文的結構類比中，可對應多模組整合／OW3gs 結構。"]
    },
    LOC6: {
      english: "Algorithm", title: "演算法", tab: "演算法", category: "演算法",
      copy: "把『怎麼理解、怎麼判讀、怎麼比較、怎麼處理』整理成可以重複執行、可以檢查的規則與流程。",
      extra: ["整理判讀、比較、治理與分析時可重複使用的規則。","月之符文在此對應符文演算法。","演算法描述如何處理，不等於單一價值答案。","成熟演算法可以交由 LOC7 封裝成可重用模組。"]
    },
    LOC7: {
      english: "Module", title: "模組", tab: "模組", category: "模組",
      copy: "把演算法、資料、知識與功能封裝成可以組合、重用與替換的系統單元。LOC1–LOC8 都是構成 LOC 語言系統模型的語言系統模組。",
      extra: ["模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","模組內可以使用一個或多個演算法。","模型（Model）由模組（Modules）組合而成；LOC 本體不是單一模組。","實作技術可以更換，不改變 LOC 的模型層級。"]
    },
    LOC8: {
      english: "Evolution", title: "推演", tab: "推演", category: "推演",
      copy: "處理『它在時間中怎麼改變』。把模型、模組、作品、事件與語言放回不同時期，觀察前後差異、變化方向與一路形成的軌跡。",
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
