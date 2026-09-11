const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");
  const attributes = document.getElementById("attributes");
  const runeImage = document.getElementById("rune-image");

  if (moonText) moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  if (card) card.addEventListener("click", () => { window.location.href = "lots.html#draw"; });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
        <span class="rune66-kicker">${escapeHtml(english)}</span>
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
          <span><strong>查看完整月之符文資料</strong><small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small></span>
          <span aria-hidden="true">→</span>
        </a>`;
    } catch (error) {
      console.error("Failed to render homepage rune from runes66.json", error);
    }
  }

  renderHomepageRune66(65);

  const frameworkInfo = {
    LOC1: { english:"LunaRunes", title:"月之符文", tab:"月之符文", category:"LunaRunes｜月之符文", copy:"LOC1 是 LunaRunes（月之符文）。以 66 個中文單字作為固定語彙基底，並透過分組、方向與多卡語法形成可運作的符號式語言模型。", extra:["66 個月之符文構成固定語彙骨架。","四向描述同一符文在不同狀態下的表現。","單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。"] },
    LOC2: { english:"Context", title:"脈絡", tab:"脈絡", category:"Context｜脈絡", copy:"處理彼此怎麼連。把符文、作品、事件與概念放進關係與情境中，讓單一內容能看見它和其他內容之間的脈絡。", extra:["關係描述兩個內容之間如何連接。","情境與事件把關係放進具體脈絡中。","關係圖（Graph）把大量內容與關係組成可觀察的整體。"] },
    LOC3: { english:"Music", title:"音樂", tab:"音樂", category:"Music｜音樂", copy:"讓語言進入聲音。歌曲、歌詞、曲風與創作時期都能成為可搜尋、可比較的語言資料。", extra:["目前主要音樂來源為 Suno。","歌曲與歌詞保留作品、主題與時期資訊。","曲風與既有標籤可以直接成為搜尋與統計資料。"] },
    LOC4: { english:"Literary", title:"文字創作", tab:"文字創作", category:"Literary｜文字創作", copy:"承接小說、文章、生活文字與其他文字作品，並保留來源、版本、首次發表與後續改寫之間的關係。", extra:["包含小說、文章、散文與生活文字。","原始文本與後續版本分開保存。","文字作品可以進一步進入脈絡、搜尋與語意分析。"] },
    LOC5: { english:"Multimedia", title:"多媒體", tab:"多媒體", category:"Multimedia｜多媒體", copy:"把語言延伸到圖像、影音與其他視覺形式，並整合不同媒介中的語意與功能。", extra:["包含圖像、短影音、影片、MV 與系統視覺化。","多媒體是語言的跨媒介表達，不只是素材分類。","不同媒介可以共享標籤、脈絡與語意關係。"] },
    LOC6: { english:"Algorithm", title:"演算法", tab:"演算法", category:"Algorithm｜演算法", copy:"把怎麼理解、判讀、比較與處理整理成可以重複執行、可以檢查的規則與流程。", extra:["整理判讀、比較、治理與分析時可重複使用的規則。","演算法描述如何處理，不等於單一價值答案。"] },
    LOC7: { english:"Module", title:"演算模組", tab:"演算模組", category:"Module｜演算模組", copy:"把演算法、資料、知識與功能封裝成可以組合、重用與替換的演算模組。", extra:["演算模組可以整合搜尋、KM、RAG、Graph、文字分析或其他功能。","一個演算模組內可以使用一個或多個演算法。"] },
    LOC8: { english:"Evolution", title:"推演引擎", tab:"推演引擎", category:"Evolution｜推演", copy:"把模組、作品、事件與語言放回不同時期，觀察前後差異與變化方向，並提出可選擇的推演路徑。", extra:["時期用來區分相對穩定的狀態。","時間線整理事件與作品出現的位置。","趨勢比較不同時期的語言與作品變化。"] }
  };

  const tabs = document.getElementById("framework-tabs");
  const kicker = document.getElementById("framework-detail-kicker");
  const title = document.getElementById("framework-detail-title");
  const copy = document.getElementById("framework-detail-copy");
  const extra = document.getElementById("framework-detail-extra");

  function applyFrameworkInfo(key) {
    const item = frameworkInfo[key] || frameworkInfo.LOC1;
    if (kicker) kicker.textContent = item.english;
    if (title) title.textContent = item.title;
    if (copy) copy.textContent = item.copy;
    if (extra) {
      const details = (item.extra || []).map(text => `<li>${escapeHtml(text)}</li>`).join("");
      extra.innerHTML = `<li><strong>分類：</strong>${escapeHtml(item.category)}</li>${details}`;
    }
  }

  if (tabs) {
    tabs.setAttribute("aria-label", "分類");
    document.querySelectorAll(".framework-tab").forEach(btn => {
      const item = frameworkInfo[btn.dataset.locKey];
      if (item) btn.textContent = item.tab;
      btn.addEventListener("click", () => applyFrameworkInfo(btn.dataset.locKey));
    });
  }

  document.querySelectorAll("[data-loc-open]").forEach(btn => {
    const item = frameworkInfo[btn.dataset.locOpen];
    if (item) btn.setAttribute("aria-label", `查看${item.tab}說明`);
    btn.addEventListener("click", () => applyFrameworkInfo(btn.dataset.locOpen));
  });

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
