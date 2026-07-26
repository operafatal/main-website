(() => {
  const openButtons = document.querySelectorAll("[data-review-open]");

  openButtons.forEach((button) => {
    const dialog = document.getElementById(button.dataset.reviewOpen);

    if (!dialog) {
      return;
    }

    button.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    });

    dialog.querySelectorAll("[data-review-close]").forEach((closeButton) => {
      closeButton.addEventListener("click", () => {
        dialog.close();
      });
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });
})();
