
window.addEventListener("DOMContentLoaded", () => {
  const image = document.getElementById("rune-image");
  const description = document.getElementById("description");

  setTimeout(() => {
    image.classList.add("show");
  }, 300);

  setTimeout(() => {
    description.classList.add("show");
  }, 1300);
});
