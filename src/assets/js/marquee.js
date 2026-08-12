(() => {
  // .marquee__track holds two identical <ul class="marquee__list"> copies
  // side by side; the scroll must shift by exactly the distance between
  // them for a seamless loop.
  //
  // v1 (CSS-only translateX(-50%)): assumed the track's own max-content
  // width -- built from many clamp(vw...)-sized logo items -- sub-pixel
  // rounds to exactly double the first list's width. Chrome happens to
  // round that consistently; other engines don't always agree, visibly
  // overlapping the seam.
  //
  // v2 (JS measures first list's width, feeds it into a CSS custom
  // property the @keyframes animation reads): still overlapped in real
  // Safari. Suspected cause: the CSS animation starts immediately at
  // parse time using the CSS fallback value, before deferred JS has run,
  // and not every engine re-reads a custom property changed later inside
  // an already-running animation.
  //
  // v3 (this version) removes both assumptions at once: no CSS animation
  // is involved at all (JS drives transform directly every frame via
  // requestAnimationFrame), and the shift distance is measured directly
  // as the real gap between the two lists' rendered positions -- not
  // inferred from the first list's own width. Those two numbers should
  // be identical for pixel-perfect identical markup, but apparently
  // aren't always in every engine (the same rounding drift v1's comment
  // above describes for the track's total width also applies, less
  // obviously, between the two list copies individually) -- measuring
  // the actual gap sidesteps that assumption too, whatever causes it.
  const DURATION_MS = 26000;
  const tracks = document.querySelectorAll(".marquee__track");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return;
  }

  tracks.forEach((track) => {
    const lists = track.querySelectorAll(".marquee__list");
    const firstList = lists[0];
    const secondList = lists[1];

    if (!firstList || !secondList) {
      return;
    }

    let shiftWidth = 0;

    const measure = () => {
      const distance = secondList.getBoundingClientRect().left - firstList.getBoundingClientRect().left;
      if (distance > 0) {
        shiftWidth = distance;
      }
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(firstList);
      observer.observe(secondList);
    } else {
      window.addEventListener("resize", measure);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }

    // Hand off from the CSS keyframe fallback (only relevant if this
    // script never ran at all) to direct per-frame control.
    track.style.animation = "none";

    let startTime = null;

    const step = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      if (shiftWidth > 0) {
        const elapsed = (timestamp - startTime) % DURATION_MS;
        const progress = elapsed / DURATION_MS;
        track.style.transform = `translateX(${-progress * shiftWidth}px)`;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
})();
