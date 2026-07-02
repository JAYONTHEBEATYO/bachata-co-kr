document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-video-button]");
  if (!button) return;

  const loader = button.closest(".video-loader");
  if (!loader || loader.dataset.loaded === "true") return;

  const iframe = document.createElement("iframe");
  iframe.loading = "lazy";
  iframe.src = loader.dataset.embed;
  iframe.title = loader.dataset.title || "Bachata video";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;

  loader.dataset.loaded = "true";
  loader.textContent = "";
  loader.appendChild(iframe);
});

document.addEventListener("toggle", (event) => {
  const opened = event.target;
  if (!opened.matches(".bk-nav details[open]")) return;

  document.querySelectorAll(".bk-nav details[open]").forEach((details) => {
    if (details !== opened) details.removeAttribute("open");
  });
}, true);
