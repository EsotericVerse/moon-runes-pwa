const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("rune-card");
  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "runes.html#draw";
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
