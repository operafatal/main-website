(() => {
  // .marquee__track holds two identical <ul class="marquee__list"> copies
  // side by side; the scroll must shift by exactly one list's width for a
  // seamless loop. Earlier version measured the real width via JS but still
  // let the CSS @keyframes animation (driven by a --marquee-shift custom
  // property) do the actual moving -- that still overlapped in real Safari.
  // Root cause: the CSS animation starts immediately using the CSS
  // fallback value (var(--marquee-shift, 50%)), before deferred JS has had
  // a chance to run and correct it. Chrome re-evaluates var() references
  // inside a running animation live, so the correction visibly "catches
  // up" there and the bug never showed in testing -- but engines aren't
  // required to do that, and evidently at least one real-device browser
  // resolves the keyframe's target once at animation start and never
  // re-reads it again, so the correction silently never took effect.
  // Driving the position directly from JS on every frame removes the
  // dependency on that behavior entirely: there is no keyframe target to
  // cache, so there is nothing for any engine to get stale.
  const DURATION_MS = 26000;
  const tracks = document.querySelectorAll(".marquee__track");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return;
  }

  tracks.forEach((track) => {
    const firstList = track.querySelector(".marquee__list");

    if (!firstList) {
      return;
    }

    let shiftWidth = 0;

    const measure = () => {
      const width = firstList.getBoundingClientRect().width;
      if (width > 0) {
        shiftWidth = width;
      }
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(measure).observe(firstList);
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
