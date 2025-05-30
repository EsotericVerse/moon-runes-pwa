window.addEventListener("DOMContentLoaded", () => {
  const image = document.getElementById("rune-image");
  const card = document.getElementById("rune-card");

  // 點擊事件：跳轉到占卜結果頁面
  card.addEventListener("click", () => {
    window.location.href = "result.html"; // 當前頁面跳轉到 result.html
  });
});
