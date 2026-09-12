const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "lots.html#draw";
    });
  }

  // Homepage entry governance: LOC must not require prior understanding before use.
  const heroNote = document.querySelector("body.loc-page-index .hero-note");
  if (heroNote) {
    const strong = heroNote.querySelector("strong");
    if (strong) strong.textContent = "月之符文是種子，但不是使用門檻。";
    const paragraph = heroNote.querySelector("p");
    if (paragraph) paragraph.textContent = "不知道從哪邊開始？沒關係！不用先了解或知道什麼，抽張牌就知道！";
  }

  // The old Learn → Try → Explore → Understand flow duplicated the homepage and
  // contradicted the no-prerequisite entry principle, so remove it from the rendered page.
  document.querySelector("body.loc-page-index #start-guide")?.remove();

  // Remove the matching quick-link after the section is removed.
  const quickLinks = document.querySelector("body.loc-page-index .home-quick-links");
  if (quickLinks) {
    [...quickLinks.querySelectorAll("a")].forEach(link => {
      if ((link.getAttribute("href") || "").includes("start")) {
        const next = link.nextElementSibling;
        if (next?.tagName === "SPAN") next.remove();
        link.remove();
      }
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
