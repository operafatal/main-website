(() => {
  const roots = Array.from(document.querySelectorAll("[data-work-tabs]"));

  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    const tabs = Array.from(root.querySelectorAll("[data-work-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-work-panel]"));

    if (!tabs.length || !panels.length) {
      return;
    }

    function activate(slug, updateHash = true) {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.workTab === slug;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.workPanel !== slug;
      });

      if (updateHash) {
        history.replaceState(null, "", `#${slug}`);
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab.dataset.workTab));
    });

    const initial = window.location.hash.replace("#", "").split(":")[0];
    if (initial && tabs.some((tab) => tab.dataset.workTab === initial)) {
      activate(initial, false);
      return;
    }
  });
})();
