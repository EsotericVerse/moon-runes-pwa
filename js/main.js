const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "lots.html#draw"; });

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC（月典）是一套用來分析、整理、搜尋並推演語言的語言模型框架（Language Model Framework），由 LOC1–LOC8 語言系統模組組成。月之符文（LunaRunes）則演變為可實際運作的符號式語言模型（Symbolic Language Model）。"
    );
  }

  const heroSubtitle = document.querySelector(".hero .loc-header-subtitle");
  if (heroSubtitle) {
    heroSubtitle.textContent = "從語彙開始，讓脈絡、作品、演算法與時間彼此連結，再持續推演。";
  }

  const heroCopy = document.querySelector(".hero .loc-header-copy");
  if (heroCopy) {
    heroCopy.textContent = "月典是一套用來分析、整理、搜尋並推演語言的語言模型框架。LOC1–LOC8 是組成框架的語言系統模組；月之符文則是可實際運作的符號式語言模型。";
  }

  const heroNote = document.querySelector(".hero-note");
  if (heroNote) {
    heroNote.innerHTML = `<div class="moon" aria-hidden="true"></div>
      <strong>月之符文是種子，但不是使用門檻。</strong>
      <p>不必先知道或學會所有符文，也不用先會解牌。你可以先抽牌、找作品、看脈絡分析或關鍵字排行；想深入時，LOC 再把底層結構展開。</p>`;
  }

  const startCopy = document.querySelector('[aria-labelledby="start-title"] .section-heading > p');
  if (startCopy) {
    startCopy.textContent = "完全的新手可以看「新手教學」。第一次使用可直接抽取每日符文。想查月之符文資料可進入「月之符文」。想理解整體則查看「LOC架構圖」。";
  }

  const runeEyebrow = document.querySelector("#rune-entry .rune-entry-eyebrow");
  if (runeEyebrow) runeEyebrow.textContent = "LOC1 · LunaRunes";

  const runeTitle = document.querySelector("#rune-entry #rune-title");
  if (runeTitle) runeTitle.textContent = "問一件事，或直接抽取一個語言起點";

  const runeSectionLead = document.querySelector("#rune-entry .section-heading > p");
  if (runeSectionLead) {
    runeSectionLead.textContent = "月之符文由 66 個中文單字構成。可以先抽牌，再依需要查看符文本義、方向、脈絡與延伸內容。";
  }

  const runeIntro = document.querySelector("#rune-entry .rune-intro");
  if (runeIntro) {
    runeIntro.innerHTML = "<strong>LOC1 · LunaRunes（月之符文）</strong>是 LOC 的符號式語言模型實作，以 66 個中文單字作為固定語彙基底。";
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
      #attributes .rune66-note{margin:10px 0 0;color:var(--loc-text);font-size:.9rem;line-height:1.65}
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
      const keywords = row.關鍵詞 ?? row.keyword ?? "";
      const archetype = row.人格原型 ?? "";
      const note = row.特別說明 ?? "";
      const image = row.image ?? row.圖檔名稱 ?? (id && name ? `${String(id).padStart(2, "0")}_${name}.png` : "");

      if (runeImage && image) {
        runeImage.src = image.includes("/") ? image : `64images/${image}`;
        runeImage.alt = `${name}之符文`;
      }

      attributes.innerHTML = `
        <span class="rune66-kicker">${escapeHtml(String(english))}</span>
        <strong class="rune66-title">${escapeHtml(name)}之符文</strong>
        ${note ? `<p class="rune66-note">${escapeHtml(note)}</p>` : ""}
        <div class="rune66-details">
          ${keywords ? `<p class="rune66-detail"><strong>關鍵詞：</strong>${escapeHtml(keywords)}</p>` : ""}
          ${archetype ? `<p class="rune66-detail"><strong>人格原型：</strong>${escapeHtml(archetype)}</p>` : ""}
          ${group ? `<p class="rune66-detail"><strong>所屬分組：</strong>${escapeHtml(group)}</p>` : ""}
          ${attribute ? `<p class="rune66-detail"><strong>卡片屬性：</strong>${escapeHtml(attribute)}</p>` : ""}
          <p class="rune66-detail"><strong>月相：</strong>${escapeHtml(phase || "無")} / <strong>真實月相：</strong>${escapeHtml(realPhase)}</p>
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
    { english: "LunaRunes", title: "月之符文", copy: "LOC1 · LunaRunes。以 66 個中文單字作為固定語彙基底，提供符號式語言模型的起點。" },
    { english: "Context", title: "脈絡", copy: "LOC2 · Context。把符文、作品、事件與概念放進關係、情境與 Graph 中。" },
    { english: "Music", title: "音樂", copy: "LOC3 · Music。讓語言進入音樂、歌詞、曲風與創作時期。" },
    { english: "Literary", title: "文字創作", copy: "LOC4 · Literary。承接小說、文章與其他文字作品。" },
    { english: "Multimedia", title: "多媒體", copy: "LOC5 · Multimedia。整合文字、音樂、圖像與影音。" },
    { english: "Algorithm", title: "演算法", copy: "LOC6 · Algorithm。把判讀、比較、治理、組合與分析整理成可重複執行的規則。" },
    { english: "Module", title: "演算模組", copy: "LOC7 · Module。把演算法、資料、知識與功能封裝成可組合與重用的模組。" },
    { english: "Evolution", title: "推演引擎", copy: "LOC8 · Evolution。把模組、作品、事件與語言放回時間中觀察與推演。" }
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
    frameworkCopy.textContent = "LOC 是一套語言模型框架（Language Model Framework）。LOC1–LOC8 是組成框架的八個語言系統模組，分別為 LunaRunes、Context、Music、Literary、Multimedia、Algorithm、Module 與 Evolution。";
  }

  const aboutTitle = document.getElementById("about-title");
  if (aboutTitle) {
    aboutTitle.textContent = "治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。";
  }

  const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
  if (aboutCopy) {
    aboutCopy.innerHTML = "月之符文本身是占卜指示籤詩的分析建議，重在符文本身的語彙交叉分析；巧妙的是，即使轉換語系也能通用。<br>它採取不帶神秘學預設的中立態度，重在文字本身，不預設道德判斷。<br><br>月典從月之符文開始，後來逐步演變成與月之符文相輔相成的語言模型框架；<br>而月之符文，也在這個過程中演變成了符號式語言模型。<br><br>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，<br>而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構模型。<br><br>人總是要進步。過去雖不可改變，仍可以從過去截取經驗，才能進一步面對未來的各種可能。<br><br>月典提供一套方便的解析模組，不強迫接受，但可以參考。<br><br>只希望每個人都能藉由這些，更有效率、更輕鬆地整理自己的數位資產與語言紀錄。";
  }

  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes", title: "月之符文", tab: "月之符文", category: "LunaRunes｜月之符文",
      copy: "LOC1 是 LunaRunes（月之符文）。以 66 個中文單字作為固定語彙基底，並透過分組、方向與多卡語法形成可運作的符號式語言模型。",
      extra: ["66 個月之符文構成固定語彙骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。"]
    },
    LOC2: {
      english: "Context", title: "脈絡", tab: "脈絡", category: "Context｜脈絡",
      copy: "處理彼此怎麼連。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡。",
      extra: ["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","關係圖（Graph）把大量內容與關係組成可觀察的整體。"]
    },
    LOC3: {
      english: "Music", title: "音樂", tab: "音樂", category: "Music｜音樂",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風與創作時期都能成為可搜尋、可比較的語言資料。",
      extra: ["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。","曲風與既有標籤可以直接成為搜尋與統計資料。"]
    },
    LOC4: {
      english: "Literary", title: "文字創作", tab: "文字創作", category: "Literary｜文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品，並保留來源、版本、首次發表與後續改寫之間的關係。",
      extra: ["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。","文字作品可以進一步進入脈絡、搜尋與語意分析。"]
    },
    LOC5: {
      english: "Multimedia", title: "多媒體", tab: "多媒體", category: "Multimedia｜多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。",
      extra: ["包含圖像、短影音、影片、MV 與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。","不同媒介可以共享標籤、脈絡與語意關係。"]
    },
    LOC6: {
      english: "Algorithm", title: "演算法", tab: "演算法", category: "Algorithm｜演算法",
      copy: "把怎麼理解、判讀、比較與處理整理成可以重複執行、可以檢查的規則與流程。",
      extra: ["整理判讀、比較、治理與分析時可重複使用的規則。","演算法描述如何處理，不等於單一價值答案。"]
    },
    LOC7: {
      english: "Module", title: "演算模組", tab: "演算模組", category: "Module｜演算模組",
      copy: "把演算法、資料、知識與功能封裝成可以組合、重用與替換的演算模組。",
      extra: ["演算模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","一個演算模組內可以使用一個或多個演算法。"]
    },
    LOC8: {
      english: "Evolution", title: "推演引擎", tab: "推演引擎", category: "Evolution｜推演",
      copy: "把模組、作品、事件與語言放回不同時期，觀察前後差異與變化方向，並提出可選擇的推演路徑。",
      extra: ["時期用來區分相對穩定的狀態。","時間線整理事件與作品出現的位置。","趨勢比較不同時期的語言與作品變化。"]
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
