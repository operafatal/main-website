(() => {
  const groups = document.querySelectorAll("[data-load-more]");

  groups.forEach((group) => {
    const step = Number(group.dataset.loadMoreStep) || 3;
    const items = Array.from(group.querySelectorAll("[data-load-more-item]"));
    const button = group.querySelector("[data-load-more-button]");

    if (!button || items.length <= step) {
      if (button) button.hidden = true;
      return;
    }

    let visibleCount = step;

    function reveal() {
      items.forEach((item, index) => {
        item.hidden = index >= visibleCount;
      });
      button.hidden = visibleCount >= items.length;
    }

    button.addEventListener("click", () => {
      visibleCount += step;
      reveal();
    });

    reveal();
  });
})();
