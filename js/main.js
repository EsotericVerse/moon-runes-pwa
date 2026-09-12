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

  // Merge the useful beginner tutorial copy into the real homepage entry instead of
  // maintaining a second Learn → Try → Understand flow.
  const runeEntry = document.querySelector("body.loc-page-index #rune-entry");
  if (runeEntry) {
    const title = runeEntry.querySelector("#rune-title");
    if (title) title.textContent = "問一件事，或讓語言自己推演成長，最後讓你選擇成為什麼樣子。";

    const intro = runeEntry.querySelector(".section-heading > p");
    if (intro) intro.textContent = "直接從一個問題開始，選擇想要的抽取方式，讓月之符文提供一個新的語言起點，它將會推演出一個實用的指示。";

    const beginner = runeEntry.querySelector(".rune-intro");
    if (beginner) {
      beginner.innerHTML = "<strong>不知道怎麼說，就先抽一張。</strong> 不必先知道或學會所有符文，也不必先懂得解牌。月之符文提供一個語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。";
    }
  }

  // The former Start Here section duplicated the homepage and imposed a learning order.
  document.querySelector("body.loc-page-index #start-guide")?.remove();

  // The dedicated beginner tutorial entry is no longer needed after its useful copy is
  // integrated into the homepage. Keep tutorial01 only as a compatibility redirect.
  document.querySelector('body.loc-page-index .hero-actions a[href="tutorial01.html"]')?.remove();
  document.querySelectorAll("body.loc-page-index #current-progress .evolution-proof-item").forEach(item => {
    const category = item.querySelector(".text-category")?.textContent?.trim();
    if (category === "Tutorial" || item.querySelector('a[href="tutorial01.html"]')) item.remove();
  });

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
