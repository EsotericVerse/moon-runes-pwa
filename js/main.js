const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) {
    moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  }

  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "runes.html#draw";
    });
  }

  // Homepage framework quick menu: keep the visible taxonomy domain-first.
  // LOC1–8 remains an internal architecture key, but is intentionally minimized in the UI.
  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes",
      title: "月之符文",
      copy: "以 66 個中文單字構成基本語彙，透過四向、月相與不同抽牌結構，形成可以組合與判讀的語言。",
      category: "月之符文",
      tab: "月之符文"
    },
    LOC2: {
      english: "Context",
      title: "脈絡",
      copy: "把語彙、作品、事件與概念放進關係、情境、事件與關係圖中，使內容能在彼此連結的脈絡裡被觀察與理解。",
      category: "脈絡 · 關係圖",
      tab: "脈絡"
    },
    LOC3: {
      english: "Music",
      title: "音樂",
      copy: "讓語言進入聲音；歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、比較與連結的語言資料。",
      category: "音樂 · Suno",
      tab: "音樂"
    },
    LOC4: {
      english: "Literary",
      title: "文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品，並保留來源、版本、首次發表與後續改寫之間的關係。",
      category: "文字創作",
      tab: "文字創作"
    },
    LOC5: {
      english: "MultiMedia",
      title: "多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，觀察同一概念在文字、聲音與畫面中的跨媒介表達。",
      category: "多媒體",
      tab: "多媒體"
    },
    LOC6: {
      english: "Methodology",
      title: "方法論",
      copy: "整理理解、判讀、比較與處理語言的方法，讓分散的經驗與判斷形成可重複使用、可以檢查的方法體系。",
      category: "方法論",
      tab: "方法論"
    },
    LOC7: {
      english: "Algorithm",
      title: "演算法",
      copy: "把語彙、脈絡與方法轉成可重複執行的結構，支援搜尋、知識整理、關聯、RAG 與其他文字分析。",
      category: "演算法",
      tab: "演算法"
    },
    LOC8: {
      english: "Evolution",
      title: "推演",
      copy: "把作品、事件與語言放回時間與時期中，觀察前後差異、趨勢、軌跡與變化方向。",
      category: "推演",
      tab: "推演"
    }
  };

  const modalTitle = document.getElementById("framework-modal-title");
  const tabs = document.getElementById("framework-tabs");
  const kicker = document.getElementById("framework-detail-kicker");
  const title = document.getElementById("framework-detail-title");
  const copy = document.getElementById("framework-detail-copy");
  const extra = document.getElementById("framework-detail-extra");

  if (modalTitle) modalTitle.textContent = "快速說明";

  // Classification belongs below the description, not above it.
  if (tabs && copy?.parentNode) {
    copy.insertAdjacentElement("afterend", tabs);
    tabs.setAttribute("aria-label", "分類");
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

    // Put classification immediately below description / selector.
    if (extra) {
      extra.innerHTML = `<li><strong>分類：</strong>${item.category}</li>`;
    }
  }

  document.querySelectorAll(".framework-tab").forEach(btn => {
    btn.addEventListener("click", () => applyFrameworkInfo(btn.dataset.locKey));
  });

  document.querySelectorAll("[data-loc-open]").forEach(btn => {
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
