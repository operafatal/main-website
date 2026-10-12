// Aktuelles: move events whose last day (data-end-date) lies before today
// (Berlin time) from "Kommende Termine" into the matching archive year.
// Also prunes past dates from the "Termine & Tickets" box on detail pages.
// The build already does this split (splitAktuelles in eleventy.config.js);
// this repeats it in the browser so the page stays correct between deploys.
(function () {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

  document.querySelectorAll("[data-aktuelles-upcoming]").forEach((upcoming) => {
    const panel = upcoming.closest("[data-work-panel]") || document;
    const archive = panel.querySelector("[data-aktuelles-archive]");
    if (!archive) {
      return;
    }

    upcoming.querySelectorAll(".aktuelles-row").forEach((row) => {
      const end = row.dataset.endDate || row.dataset.sortDate || "";
      if (!end || end >= today) {
        return;
      }

      const sortDate = row.dataset.sortDate || end;
      const year = sortDate.slice(0, 4);
      let section = archive.querySelector(`.aktuelles-year[data-year="${year}"]`);
      if (!section) {
        section = document.createElement("section");
        section.className = "aktuelles-year";
        section.dataset.year = year;
        const heading = document.createElement("h3");
        heading.textContent = year;
        const list = document.createElement("div");
        list.className = "aktuelles-list aktuelles-list--archive";
        section.append(heading, list);
        const later = [...archive.querySelectorAll(".aktuelles-year")].find((entry) => entry.dataset.year < year);
        archive.insertBefore(section, later || null);
      }

      const list = section.querySelector(".aktuelles-list");
      const older = [...list.querySelectorAll(".aktuelles-row")].find((entry) => (entry.dataset.sortDate || "") < sortDate);
      list.insertBefore(row, older || null);
    });

    const empty = upcoming.querySelector(".aktuelles-empty");
    if (empty) {
      empty.hidden = upcoming.querySelector(".aktuelles-row") !== null;
    }
  });

  // Detail pages: drop past performances from "Termine & Tickets", and the
  // whole section once nothing is left.
  document.querySelectorAll("[data-ticket-section]").forEach((section) => {
    section.querySelectorAll("[data-end-date]").forEach((row) => {
      if (row.dataset.endDate < today) {
        row.remove();
      }
    });
    if (!section.querySelector("[data-end-date]")) {
      section.hidden = true;
      document.querySelectorAll("[data-hero-tickets]").forEach((link) => {
        link.hidden = true;
      });
    }
  });
})();
