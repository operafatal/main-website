(() => {
  const openButtons = document.querySelectorAll("[data-course-modal-open], [data-event-modal-open]");
  const dialogs = new Map();

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  openButtons.forEach((button) => {
    const dialogId = button.dataset.courseModalOpen || button.dataset.eventModalOpen;
    const dialog = document.getElementById(dialogId);

    if (!dialog) {
      return;
    }

    dialogs.set(dialogId, dialog);

    button.addEventListener("click", () => {
      openDialog(dialog);
    });

    dialog.querySelectorAll("[data-modal-close]").forEach((closeButton) => {
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

  function openFromHash() {
    const hash = window.location.hash.replace("#", "");
    const modalId = hash.includes(":") ? hash.split(":")[1] : hash;

    if (!modalId) {
      return;
    }

    openDialog(dialogs.get(modalId));
  }

  window.addEventListener("hashchange", openFromHash);
  window.addEventListener("DOMContentLoaded", openFromHash);
  window.setTimeout(openFromHash, 0);
})();
