(function () {
  "use strict";

  var hero = document.querySelector(".hero");
  var media = hero && hero.querySelector(".hero__media");
  if (!hero || !media) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Background moves at 35% of scroll speed — "slower than the rest of the
  // page" reads as depth. Transform-only (no top/background-position writes)
  // so this stays on the compositor thread, no layout thrashing.
  var speed = 0.35;
  var ticking = false;

  function update() {
    var rect = hero.getBoundingClientRect();
    ticking = false;

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return;
    }

    var offset = Math.max(0, -rect.top) * speed;
    media.style.transform = "translateY(" + offset + "px)";
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
})();
