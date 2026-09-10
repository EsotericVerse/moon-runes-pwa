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

  // Homepage framework quick menu. LOC1–8 stays as the internal key only;
  // visible labels use the domain names directly.
  const frameworkInfo = {
    LOC1: {
      english: "LunaRunes",
      title: "月之符文",
      copy: "以 66 個月之符文作為符文語彙（Token），提供最小語意單元，並透過四向、月相與不同抽牌結構形成可以被組合與判讀的語言。",
      category: "月之符文（符文籤詩 Lots）",
      tab: "月之符文",
      extra: [
        "66 個月之符文構成固定骨架。",
        "四向描述同一符文在不同狀態下的表現。",
        "單卡、雙卡、三卡、五卡與 OW3gs 各有自己的語法。",
        "月之符文是整套語言系統的起點，但不是使用門檻。"
      ]
    },
    LOC2: {
      english: "Context",
      title: "脈絡",
      copy: "處理『彼此怎麼連』。把語彙、作品、事件與概念放進關係、情境、事件與脈絡圖中，讓單一內容不脫離它所在的情境。",
      category: "脈絡（關係圖）",
      tab: "脈絡",
      extra: [
        "關係描述兩個節點之間如何連接。",
        "情境與事件把關係放進具體脈絡中。",
        "脈絡圖把大量節點與關係組成可觀察的整體。",
        "脈絡沙盒遊戲是其中一種互動實作。"
      ]
    },
    LOC3: {
      english: "Music",
      title: "音樂",
      copy: "讓語言進入聲音。歌曲、歌詞、曲風、角色與創作時期都能成為可搜尋、可比較、可和其他作品連結的語言資料。",
      category: "音樂（Suno）",
      tab: "音樂",
      extra: [
        "目前主要音樂來源為 Suno。",
        "歌曲與歌詞保留作品、主題與時期資訊。",
        "音樂可和文字、多媒體與脈絡互相連結。"
      ]
    },
    LOC4: {
      english: "Literary",
      title: "文字創作",
      copy: "承接小說、文章、生活文字與其他文字作品。除了保存作品本身，也保留來源、版本、首次發表與後續改寫之間的關係。",
      category: "文字創作",
      tab: "文字創作",
      extra: [
        "包含小說、文章、散文與生活文字。",
        "原始文本與後續版本分開保存。",
        "同一主題可以跨作品、時期持續發展。"
      ]
    },
    LOC5: {
      english: "MultiMedia",
      title: "多媒體",
      copy: "把語言延伸到圖像、影音與其他視覺形式，觀察同一概念在文字、聲音與畫面中如何被重新表達。",
      category: "多媒體",
      tab: "多媒體",
      extra: [
        "包含圖像、Reels、影片、MV 與系統視覺化。",
        "多媒體是語言的跨媒介表達，不只是素材分類。",
        "同一概念可以同時存在文字、音樂與影像版本。"
      ]
    },
    LOC6: {
      english: "Methodology",
      title: "方法論",
      copy: "整理『怎麼理解、怎麼判讀、怎麼比較、怎麼處理』的方法，讓原本分散的經驗與判斷變成可以重複使用、可以檢查的方法體系。",
      category: "方法論",
      tab: "方法論",
      extra: [
        "整理判讀、比較、治理與分析時可重複使用的原則。",
        "政德風是重要的個人方法與治理案例。",
        "方法論描述怎麼做，不等於單一價值答案。",
        "成熟的方法可以再被結構化並交由演算法執行。"
      ]
    },
    LOC7: {
      english: "Algorithm",
      title: "演算法",
      copy: "把語彙、脈絡與方法轉成可以重複執行的結構，讓搜尋、知識整理、關聯與推理不再只靠人工直覺。",
      category: "演算法",
      tab: "演算法",
      extra: [
        "文字建築是重要的結構方法之一。",
        "Search、FAQ／RAG、Graph RAG traversal 與文字分析都屬於演算法實作。",
        "演算法負責把方法變成可執行、可重複的規則與流程。",
        "演算法可以使用不同技術，不綁定單一 AI 或模型。"
      ]
    },
    LOC8: {
      english: "Evolution",
      title: "推演",
      copy: "處理『它在時間中怎麼改變』。把作品、事件與語言放回時期、Timeline、Trend 與 Trajectory 中，觀察前後差異與變化方向。",
      category: "推演",
      tab: "推演",
      extra: [
        "時期用來區分相對穩定的狀態。",
        "Timeline 看事件與作品的時間位置。",
        "Trend 比較不同時期的語言與作品變化。",
        "Trajectory 描述一路如何從一個狀態走到下一個狀態。",
        "推演建立在既有資料上，不等於預言。"
      ]
    }
  };

  const modalTitle = document.getElementById("framework-modal-title");
  const tabs = document.getElementById("framework-tabs");
  const kicker = document.getElementById("framework-detail-kicker");
  const title = document.getElementById("framework-detail-title");
  const copy = document.getElementById("framework-detail-copy");
  const extra = document.getElementById("framework-detail-extra");

  if (modalTitle) modalTitle.textContent = "快速說明";

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

    if (extra) {
      const details = (item.extra || []).map(text => `<li>${text}</li>`).join("");
      extra.innerHTML = `<li><strong>分類：</strong>${item.category}</li>${details}`;
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
