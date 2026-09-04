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

  // Keep Unified Search inside the normal navigation flow.
  const navLinks = document.querySelector(".nav-links");
  if (navLinks && !navLinks.querySelector('a[href="search.html"]')) {
    const unifiedNav = document.createElement("a");
    unifiedNav.href = "search.html";
    unifiedNav.textContent = "Unified Search";
    unifiedNav.setAttribute("aria-label", "開啟 LOC Unified Search");
    navLinks.appendChild(unifiedNav);
  }

  // The hero's third CTA now points to the integrated search instead of only FAQ.
  const knowledgeCta = document.querySelector('.hero-actions a[href="faq.html"]');
  if (knowledgeCta) {
    knowledgeCta.href = "search.html";
    knowledgeCta.textContent = "Unified Search";
  }

  // Option B: retain the moon motif, but demote it to a subtle background element.
  const heroNote = document.querySelector(".hero-note");
  const decorativeMoon = heroNote?.querySelector(".moon");
  if (heroNote) {
    Object.assign(heroNote.style, {
      minHeight: "230px",
      display: "grid",
      alignContent: "end",
      position: "relative"
    });
    heroNote.querySelectorAll("strong, p").forEach(node => {
      Object.assign(node.style, {
        position: "relative",
        zIndex: "1"
      });
    });
  }
  if (decorativeMoon) {
    Object.assign(decorativeMoon.style, {
      position: "absolute",
      width: "108px",
      height: "108px",
      top: "22px",
      right: "26px",
      margin: "0",
      opacity: "0.2",
      pointerEvents: "none",
      zIndex: "0",
      boxShadow: "0 0 32px rgba(231,194,125,.12), 0 0 70px rgba(180,158,255,.08)"
    });
  }

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
