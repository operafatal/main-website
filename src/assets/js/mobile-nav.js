(() => {
  // --site-header-height (tokens.css) is a build-time constant, but the
  // header's real rendered height varies (nav wrap edge cases, font
  // fallback swaps, browser zoom, translation tools re-flowing text) --
  // every sticky/offset calculation built on that constant (tab bar,
  // page-top padding) then silently drifts out of sync. Measuring the
  // actual header on load/resize and overriding the custom property with
  // the true value fixes all of those at once, regardless of *why* the
  // height changed, instead of chasing each cause individually.
  const header = document.querySelector(".site-header");

  if (header) {
    const syncHeaderHeight = () => {
      const height = header.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty("--site-header-height", `${height}px`);
      }
    };

    syncHeaderHeight();

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncHeaderHeight).observe(header);
    } else {
      window.addEventListener("resize", syncHeaderHeight);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncHeaderHeight);
    }
  }

  const toggle = document.querySelector(".site-nav-toggle");
  const nav = document.querySelector("#site-nav");

  if (!toggle || !nav) {
    return;
  }

  const closeNav = () => {
    document.body.classList.remove("nav-is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    document.body.classList.add("nav-is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    if (document.body.classList.contains("nav-is-open")) {
      closeNav();
      return;
    }

    openNav();
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("nav-is-open")) {
      closeNav();
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) {
      closeNav();
    }
  });
})();
