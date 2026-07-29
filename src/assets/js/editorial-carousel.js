(function () {
  var carousels = document.querySelectorAll("[data-editorial-carousel]");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  carousels.forEach(function (carousel) {
    var slides = Array.from(carousel.querySelectorAll("[data-editorial-slide]"));
    var previousButton = carousel.querySelector("[data-editorial-previous]");
    var nextButton = carousel.querySelector("[data-editorial-next]");
    var counter = carousel.querySelector("[data-editorial-counter]");
    var currentIndex = 0;
    var timerId = null;
    var focusIsInCarousel = false;
    var touchStartX = null;
    var pauseOnHover = carousel.getAttribute("data-editorial-pause-on-hover") !== "false";

    if (!slides.length) return;

    function updateSlide(nextIndex) {
      currentIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach(function (slide, index) {
        var isActive = index === currentIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });

      if (counter) {
        counter.textContent = (currentIndex + 1) + " / " + slides.length;
      }
    }

    function stopAutoplay() {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function canAutoplay() {
      return !prefersReducedMotion.matches
        && !focusIsInCarousel
        && !document.hidden;
    }

    function startAutoplay() {
      stopAutoplay();

      if (!canAutoplay()) return;

      var activeSlide = slides[currentIndex];
      var slideDuration = Number(activeSlide && activeSlide.getAttribute("data-editorial-duration")) || 4000;

      timerId = window.setTimeout(function () {
        updateSlide(currentIndex + 1);
        startAutoplay();
      }, slideDuration);
    }

    function moveBy(step) {
      updateSlide(currentIndex + step);
      startAutoplay();
    }

    carousel.classList.add("is-enhanced");
    updateSlide(0);

    if (slides.length < 2) {
      return;
    }

    startAutoplay();

    if (previousButton) {
      previousButton.addEventListener("click", function () {
        moveBy(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        moveBy(1);
      });
    }

    if (pauseOnHover) {
      carousel.addEventListener("pointerenter", function () {
        stopAutoplay();
      });

      carousel.addEventListener("pointerleave", function () {
        startAutoplay();
      });
    }

    carousel.addEventListener("focusin", function () {
      focusIsInCarousel = true;
      stopAutoplay();
    });

    carousel.addEventListener("focusout", function () {
      window.requestAnimationFrame(function () {
        focusIsInCarousel = carousel.contains(document.activeElement);
        startAutoplay();
      });
    });

    carousel.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBy(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBy(1);
      }
    });

    carousel.addEventListener("touchstart", function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    carousel.addEventListener("touchend", function (event) {
      if (touchStartX === null) return;

      var distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;

      if (Math.abs(distance) < 48) return;
      moveBy(distance > 0 ? -1 : 1);
    }, { passive: true });

    document.addEventListener("visibilitychange", startAutoplay);
    prefersReducedMotion.addEventListener("change", startAutoplay);
  });
})();
