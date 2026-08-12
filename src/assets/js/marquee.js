(() => {
  // .marquee__track holds two identical <ul class="marquee__list"> copies
  // side by side; the scroll animation must shift by exactly one list's
  // width for a seamless loop. The CSS-only version (translateX(-50%))
  // assumes the track's own max-content width -- built from many
  // clamp(vw...)-sized logo items -- sub-pixel-rounds to exactly double
  // the first list's width. Chrome happens to round that consistently;
  // other engines don't always agree, visibly overlapping the seam.
  // Measuring the real list width and translating by that exact pixel
  // value removes the assumption entirely.
  const tracks = document.querySelectorAll(".marquee__track");

  tracks.forEach((track) => {
    const firstList = track.querySelector(".marquee__list");

    if (!firstList) {
      return;
    }

    const syncShift = () => {
      const width = firstList.getBoundingClientRect().width;
      if (width > 0) {
        track.style.setProperty("--marquee-shift", `${width}px`);
      }
    };

    syncShift();

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncShift).observe(firstList);
    } else {
      window.addEventListener("resize", syncShift);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncShift);
    }
  });
})();
