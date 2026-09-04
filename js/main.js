function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 28) return "下弦";
  if (day >= 29 && day <= 30) return "空亡";
  return "未知";
}

function detectRealPhase() {
  const today = new Date();
  const solarYear = today.getFullYear();
  const solarMonth = today.getMonth() + 1;
  const solarDay = today.getDate();
  const lunarInfo = solarlunar.solar2lunar(solarYear, solarMonth, solarDay);
  const lunarDay = lunarInfo.lDay;
  return getLunarPhase(lunarDay);
}

const realPhase = detectRealPhase();
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  // index.html remains the LOC1 / Moon Rune landing experience,
  // while Unified Search becomes the primary cross-LOC discovery entry.
  document.title = "LOC｜月典｜Unified Search × 月之符文";
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      "LOC 月典：以 lo3rwang／政德風語言系統為基礎，提供 Unified Search、月符、作品、媒體、知識與時間語意入口。"
    );
  }

  const unifiedEntry = document.createElement("a");
  unifiedEntry.href = "search.html";
  unifiedEntry.setAttribute("aria-label", "開啟 LOC Unified Search");
  unifiedEntry.innerHTML = "<strong>Unified Search</strong><span>搜尋符文、作品、媒體、知識與 ERA</span>";
  Object.assign(unifiedEntry.style, {
    position: "fixed",
    top: "18px",
    right: "18px",
    zIndex: "9999",
    display: "grid",
    gap: "2px",
    padding: "11px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(7,19,31,.88)",
    color: "#f2f7f6",
    textDecoration: "none",
    boxShadow: "0 12px 34px rgba(0,0,0,.28)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    fontFamily: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
    lineHeight: "1.35",
    maxWidth: "230px"
  });
  const label = unifiedEntry.querySelector("strong");
  const sub = unifiedEntry.querySelector("span");
  if (label) {
    Object.assign(label.style, {fontSize:"14px", letterSpacing:".04em"});
  }
  if (sub) {
    Object.assign(sub.style, {fontSize:"11px", color:"#aebfc1"});
  }
  unifiedEntry.addEventListener("mouseenter", () => {
    unifiedEntry.style.borderColor = "rgba(126,216,197,.72)";
  });
  unifiedEntry.addEventListener("mouseleave", () => {
    unifiedEntry.style.borderColor = "rgba(255,255,255,.22)";
  });
  document.body.appendChild(unifiedEntry);

  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) {
    moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  }

  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "result.html";
    });
  }
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
