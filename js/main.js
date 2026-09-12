const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  if (card) {
    const image = card.querySelector("#rune-image");
    if (image) {
      image.src = "64images/66_命.png";
      image.alt = "命之符文";
    }
    card.addEventListener("click", () => {
      window.location.href = "lots.html#draw";
    });
  }

  // Homepage uses Fate as the fixed showcase rune; the actual draw ritual keeps Chaos.
  const showcaseRune = document.querySelector("body.loc-page-index .rune-result-card .rune-result-name");
  if (showcaseRune) {
    showcaseRune.dataset.runeName = "命";
    showcaseRune.textContent = "命";
  }

  // Homepage entry governance: no prerequisite learning order.
  const heroNote = document.querySelector("body.loc-page-index .hero-note");
  if (heroNote) {
    const strong = heroNote.querySelector("strong");
    if (strong) strong.textContent = "月之符文是種子，但不是使用門檻。";
    const paragraph = heroNote.querySelector("p");
    if (paragraph) paragraph.textContent = "不知道從哪邊開始？沒關係！不用先了解或知道什麼，抽張牌就知道！";
  }

  // Keep one concise beginner entry on the homepage instead of duplicating a tutorial.
  const runeEntry = document.querySelector("body.loc-page-index #rune-entry");
  if (runeEntry) {
    const title = runeEntry.querySelector("#rune-title");
    if (title) title.textContent = "問一件事，或讓語言自己推演成長，最後讓你選擇成為什麼樣子。";

    const intro = runeEntry.querySelector(".section-heading > p");
    if (intro) intro.textContent = "直接從一個問題開始，選擇想要的抽取方式，讓月之符文提供一個新的語言起點，它將會推演出一個實用的指示。";

    const beginner = runeEntry.querySelector(".rune-intro");
    if (beginner) {
      beginner.innerHTML = "<strong>不知道怎麼說，就先抽一張。</strong> 月之符文提供一個語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。";
    }
  }

  // The former Start Here flow duplicated the homepage and imposed a learning order.
  document.querySelector("body.loc-page-index #start-guide")?.remove();

  // Tutorial 01 is now only a compatibility redirect; remove duplicate homepage entries.
  document.querySelector('body.loc-page-index .hero-actions a[href="tutorial01.html"]')?.remove();
  document.querySelectorAll("body.loc-page-index #current-progress .evolution-proof-item").forEach(item => {
    const category = item.querySelector(".text-category")?.textContent?.trim();
    if (category === "Tutorial" || item.querySelector('a[href="tutorial01.html"]')) item.remove();
  });

  // Skills has its own section; do not repeat it again inside Author's Note.
  document.querySelector("body.loc-page-index #loc-skills-note")?.remove();

  // Author's Note keeps only the author's position, not another copy of the site description.
  const authorWords = document.querySelector("body.loc-page-index .author-words");
  if (authorWords) {
    authorWords.innerHTML = "<p>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構，才能進一步面對未來的各種可能。</p>";
    const repeatedSummary = authorWords.nextElementSibling;
    if (repeatedSummary?.tagName === "P") repeatedSummary.remove();
  }

  // Remove the matching quick-link after Start Here is removed.
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
