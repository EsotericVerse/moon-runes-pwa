window.addEventListener("DOMContentLoaded", () => {
  const image = document.getElementById("rune-image");
  const card = document.getElementById("rune-card");
  card.addEventListener("click", () => {
    window.location.href = "result.html";
  });
});