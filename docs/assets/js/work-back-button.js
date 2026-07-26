(() => {
  const backButton = document.querySelector(".work-detail__back");

  if (!backButton) {
    return;
  }

  const darkSelectors = [
    ".work-detail__hero",
    ".work-detail__section--credits",
    ".work-detail__review-dialog-head"
  ];

  let ticking = false;

  const updateBackButton = () => {
    ticking = false;
    const rect = backButton.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const previousPointerEvents = backButton.style.pointerEvents;

    backButton.style.pointerEvents = "none";
    const elementBelow = document.elementFromPoint(x, y);
    backButton.style.pointerEvents = previousPointerEvents;

    const isDark = Boolean(elementBelow && elementBelow.closest(darkSelectors.join(",")));
    backButton.classList.toggle("is-negative", isDark);
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateBackButton);
    }
  };

  updateBackButton();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate);
})();
