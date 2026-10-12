const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

const markdownIt = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
});

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), "utf8");
}

function renderMarkdown(source) {
  return markdownIt.render((source || "").trim());
}

function splitLastNote(source) {
  const marker = "\n---\n";
  const trimmed = (source || "").trim();
  const noteIndex = trimmed.lastIndexOf(marker);

  if (noteIndex === -1) {
    return {
      body: trimmed,
      note: ""
    };
  }

  return {
    body: trimmed.slice(0, noteIndex).trim(),
    note: trimmed.slice(noteIndex + marker.length).trim()
  };
}

function splitParagraphs(source) {
  return (source || "")
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseAktuelles(source) {
  const body = splitLastNote(source).body;
  const match = body.match(/## Nächste Termine \(Auswahl\)\n([\s\S]*?)\n\n## News\n([\s\S]*)$/);

  if (!match) {
    return {
      nextTerms: [],
      news: null
    };
  }

  const nextTerms = match[1]
    .trim()
    .split(/\n+/)
    .map((line) => {
      const itemMatch = line.match(/^- \*\*(.+?)\*\* — (.+)$/);

      if (!itemMatch) {
        return null;
      }

      const details = itemMatch[2].trim();
      const commaIndex = details.lastIndexOf(",");

      return {
        label: itemMatch[1].trim(),
        title: commaIndex > -1 ? details.slice(0, commaIndex).trim() : details,
        body: commaIndex > -1 ? details.slice(commaIndex + 1).trim() : ""
      };
    })
    .filter(Boolean);

  const newsLines = match[2].trim().split(/\n+/);
  const newsHeader = newsLines.shift() || "";
  const newsMatch = newsHeader.match(/^\*\*(.+?)\*\* \((.+?)\)$/);

  return {
    nextTerms,
    news: {
      label: newsMatch ? newsMatch[2].trim() : "",
      title: newsMatch ? newsMatch[1].trim() : newsHeader.replace(/^\*\*|\*\*$/g, ""),
      body: newsLines.join("\n").trim()
    }
  };
}

function groupWerkItems(data) {
  return data.categories.map((category) => ({
    ...category,
    items: data.items
      .filter((item) => item.category === category.slug && !item.hidden)
      .sort((a, b) => getSortYear(b.year) - getSortYear(a.year))
  }));
}

function getSortYear(value) {
  const years = String(value || "").match(/\d{4}/g);

  if (!years) {
    return 0;
  }

  return Math.max(...years.map(Number));
}

function filterMasterclassEntries(items) {
  return (items || []).filter((item) => item && item.meta === "Meisterkurs");
}

function byStatus(items, status) {
  return (items || []).filter((item) => item && item.status === status);
}

function byCategory(items, category) {
  if (category === "alle") {
    return items || [];
  }

  return (items || []).filter((item) => item && item.category === category);
}

// Aktuelles: merge the hand-maintained "upcoming" list and the year-grouped
// "archive" and re-split them by date at build time, so past events move to
// the archive automatically. An event stays upcoming until its endDate (last
// performance/day); without endDate its sortDate counts. "Today" is Berlin
// time. assets/js/aktuelles-archive.js repeats the same split in the browser,
// so the page stays correct between deploys.
function berlinToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

const MONTHS_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// A production with several performances is entered once, with a
// "performances" list ([{date, time?, label?}]). For the timeline each
// performance becomes its own row (own date, time and label, e.g.
// "Uraufführung" for the first one, "Vorstellung" for the rest).
function expandPerformances(item) {
  if (!Array.isArray(item.performances) || !item.performances.length) {
    return [item];
  }
  return item.performances.map((performance, index) => {
    const [year, month, day] = performance.date.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    const time = performance.time ? `${performance.time} Uhr` : "";
    const label = performance.label || item.performanceLabel || "Vorstellung";
    const { performances, endDate, ...rest } = item;
    return {
      ...rest,
      id: `${item.id}-${performance.date}`,
      productionId: item.id,
      performanceIndex: index,
      sortDate: performance.date,
      endDate: performance.date,
      day: String(day),
      month: `${MONTHS_SHORT[month - 1]} ${year}`,
      dateLabel: `${weekday}, ${day}. ${MONTHS_LONG[month - 1]} ${year}${time ? `, ${time}` : ""}`,
      categoryLabel: time ? `${label} · ${time}` : label,
      weekday,
      timeLabel: time,
      performanceLabel: label,
      ticketHref: performance.ticketHref || item.ticketHref || ""
    };
  });
}

function splitAktuelles(feed) {
  const all = [
    ...((feed && feed.upcoming) || []),
    ...((feed && feed.archive) || []).flatMap((group) => group.items || [])
  ]
    .filter(Boolean)
    .flatMap(expandPerformances);
  const today = berlinToday();
  const endOf = (item) => item.endDate || item.sortDate || "";
  const upcoming = all
    .filter((item) => endOf(item) >= today)
    .sort((a, b) => (a.sortDate || "").localeCompare(b.sortDate || ""));
  const past = all
    .filter((item) => endOf(item) < today)
    .sort((a, b) => (b.sortDate || "").localeCompare(a.sortDate || ""));

  // Repeating the full description on every performance of the same
  // production makes the timeline hard to scan: keep it on the next
  // upcoming performance only (in the archive: on the first performance);
  // the other performances show the short "shortSummary" (Jasmin's role).
  const seen = new Set();
  const trimRepeatedSummary = (item, keep) => {
    if (!item.productionId) {
      return item;
    }
    if (keep(item) && !seen.has(item.productionId)) {
      seen.add(item.productionId);
      return item;
    }
    return { ...item, summary: item.shortSummary || "" };
  };
  const upcomingRows = upcoming.map((item) => trimRepeatedSummary(item, () => true));
  const pastRows = past.map((item) => trimRepeatedSummary(item, (entry) => entry.performanceIndex === 0));

  const archive = [];
  for (const item of pastRows) {
    const year = (item.sortDate || "").slice(0, 4);
    let group = archive.find((entry) => entry.year === year);
    if (!group) {
      group = { year, items: [] };
      archive.push(group);
    }
    group.items.push(item);
  }
  return { upcoming: upcomingRows, archive, all: [...upcomingRows, ...pastRows] };
}

// Detail pages: the upcoming performances of one production (matched by
// its detail-page href), for the "Termine & Tickets" section. Same data
// and same "today" as the Aktuelles timeline, so both always agree.
function upcomingPerformances(feed, href) {
  return splitAktuelles(feed).upcoming.filter((item) => item.productionId && item.href === href);
}

function hasCategory(items, category) {
  return byCategory(items, category).length > 0;
}

// Timeline order: "offen" courses always lead (soonest first, since those
// are the ones open for registration right now), then the rest of the
// upcoming courses (soonest first), then past courses (most recent first) —
// a single flowing list instead of three headed groups. Card styling (not
// grouping) carries the offen/demnaechst/vergangen distinction now, see
// course-preview-card.
function chronological(items) {
  const today = new Date().toISOString().slice(0, 10);
  const offen = (items || []).filter((item) => item && item.status === "offen");
  const upcoming = (items || []).filter((item) => item && item.status !== "offen" && item.sortDate >= today);
  const past = (items || []).filter((item) => item && item.status !== "offen" && item.sortDate < today);

  offen.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  upcoming.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  past.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  return [...offen, ...upcoming, ...past];
}

function galleryAfterHero(items, startIndex = 1) {
  if (!Array.isArray(items) || items.length < 2) {
    return items || [];
  }

  const parsedStartIndex = Number(startIndex);
  const safeStartIndex = Math.min(Math.max(Number.isNaN(parsedStartIndex) ? 1 : parsedStartIndex, 0), items.length - 1);

  return [...items.slice(safeStartIndex), ...items.slice(0, safeStartIndex)];
}

function isExternalUrl(value) {
  return /^https?:\/\//.test(String(value || ""));
}

function creditLabel(value) {
  const labels = {
    ideeUndProduzent: "Idee & Produzent",
    musikalischeLeitung: "Musikalische Leitung",
    regieEurythmie: "Regie Eurythmie",
    mitarbeitEurythmie: "Mitarbeit Eurythmie",
    buehne: "Bühne",
    kostueme: "Kostüme",
    video: "Video",
    chorleitung: "Chorleitung",
    lightdesign: "Lightdesign",
    beleuchtung: "Beleuchtung",
    lichtregie: "Lichtregie",
    videodesign: "Videodesign",
    ausstattung: "Ausstattung",
    buehnenbildUndKostueme: "Bühnenbild & Kostüme",
    buehneUndKostueme: "Bühne & Kostüme",
    ausstattungUndProjektionen: "Ausstattung & Projektionen",
    inszenierung: "Inszenierung",
    inszenierungUndTextfassung: "Inszenierung & Textfassung",
    dialogeUndFassung: "Dialoge & Fassung",
    bearbeitungUndRegie: "Bearbeitung & Regie",
    fassungTextInszenierungAusstattung: "Fassung, Text, Inszenierung & Ausstattung",
    musikalischeLeitungUndArrangement: "Musikalische Leitung & Arrangement",
    ideeFassungTextInszenierung: "Idee, Fassung, Text & Inszenierung",
    ideeTextRegie: "Idee, Text & Regie",
    ideeVersionInszenierungAusstattung: "Idee, Version, Inszenierung & Ausstattung",
    ideeRegieUndAusstattung: "Idee, Regie & Ausstattung",
    fassung: "Fassung",
    klavier: "Klavier",
    schlagzeug: "Schlagzeug",
    chor: "Chor",
    einstudierungChor: "Einstudierung Chor",
    choreinstudierung: "Choreinstudierung",
    musikalischeBetreuung: "Musikalische Betreuung",
    technischeLeitung: "Technische Leitung",
    lektoratFassung: "Lektorat Fassung",
    choreografie: "Choreografie",
    schlagzeug: "Schlagzeug"
  };

  if (labels[value]) {
    return labels[value];
  }

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Und/g, "&")
    .replace(/^./, (letter) => letter.toUpperCase());
}

// A role's `performances` are stored one row per (name, year) -- simplest
// shape to research/append into incrementally. Grouping the same name's
// years into one line (2023-2026 for a run, "&" between separate runs,
// matching the site's existing Und->"&" convention above) happens here at
// render time instead of in the data, so werk.json never needs manual
// dedup/merge bookkeeping when a new season's cast is added.
function groupCastPerformances(performances) {
  const order = [];
  const yearsByName = new Map();

  (performances || []).forEach((performance) => {
    if (!performance || !performance.name) {
      return;
    }
    if (!yearsByName.has(performance.name)) {
      yearsByName.set(performance.name, []);
      order.push(performance.name);
    }
    if (performance.year) {
      yearsByName.get(performance.name).push(performance.year);
    }
  });

  return order.map((name) => ({
    name,
    yearsLabel: formatYearRanges(yearsByName.get(name))
  }));
}

function formatYearRanges(years) {
  if (!years || !years.length) {
    return "";
  }

  const numeric = years.map((year) => Number.parseInt(year, 10));
  const allPlainYears = numeric.every((year, index) => !Number.isNaN(year) && String(year) === String(years[index]));

  if (!allPlainYears) {
    // A non-plain value (e.g. "2023/24") can't be range-compressed
    // reliably -- fall back to listing every distinct value as-is.
    return [...new Set(years)].join(" & ");
  }

  const sortedYears = [...new Set(numeric)].sort((a, b) => a - b);
  const ranges = [];
  let rangeStart = sortedYears[0];
  let rangeEnd = sortedYears[0];

  for (let i = 1; i <= sortedYears.length; i += 1) {
    const year = sortedYears[i];
    if (year === rangeEnd + 1) {
      rangeEnd = year;
      continue;
    }
    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}–${rangeEnd}`);
    rangeStart = year;
    rangeEnd = year;
  }

  return ranges.join(" & ");
}

function buildCuratedContent() {
  const homeParagraphs = splitParagraphs(readText("content/home.md"));
  const ueberMich = splitLastNote(readText("content/ueber-mich.md"));
  const lehre = splitLastNote(readText("content/lehre.md"));
  const meisterkurse = splitLastNote(readText("content/meisterkurse.md"));
  const publikationen = splitLastNote(readText("content/publikationen.md"));
  const aktuelles = splitLastNote(readText("content/aktuelles.md"));
  const kontaktSource = readText("content/kontakt.md").replace(
    "[Kontaktformular — Platzhalter. Technischer Versand (z. B. Formspree o. ä.) ist ein separater, späterer Schritt, kein Teil der Struktur/Design-Umsetzung.]",
    '<div class="contact-placeholder">Kontaktformular folgt</div>'
  );
  const impressum = splitLastNote(readText("content/impressum.md"));
  const freshWerkData = JSON.parse(fs.readFileSync(path.join(__dirname, "src/_data/werk.json"), "utf8"));

  return {
    home: {
      heroLine: homeParagraphs[0] || "Jasmin Solfaghari — Opernregisseurin, Coach, Autorin.",
      intro: homeParagraphs[1] || "",
      teaser: homeParagraphs[2] || "",
      paragraphs: homeParagraphs
    },
    ueberMich: {
      bodyHtml: renderMarkdown(ueberMich.body),
      noteHtml: ueberMich.note ? renderMarkdown(ueberMich.note) : ""
    },
    lehre: {
      bodyHtml: renderMarkdown(lehre.body),
      noteHtml: lehre.note ? renderMarkdown(lehre.note) : ""
    },
    meisterkurse: {
      bodyHtml: renderMarkdown(meisterkurse.body),
      noteHtml: meisterkurse.note ? renderMarkdown(meisterkurse.note) : ""
    },
    publikationen: {
      bodyHtml: renderMarkdown(publikationen.body),
      noteHtml: publikationen.note ? renderMarkdown(publikationen.note) : ""
    },
    aktuelles: {
      ...parseAktuelles(aktuelles.body),
      noteHtml: aktuelles.note ? renderMarkdown(aktuelles.note) : ""
    },
    kontakt: {
      bodyHtml: renderMarkdown(splitLastNote(kontaktSource).body)
    },
    impressum: {
      bodyHtml: renderMarkdown(impressum.body),
      noteHtml: impressum.note ? renderMarkdown(impressum.note) : ""
    },
    work: {
      categories: freshWerkData.categories,
      // Filters out items with hidden:true (see werk.json) -- used by
      // inszenierung-detail.njk's pagination, so no detail page gets
      // built for a hidden production at all, not just left unlinked.
      items: freshWerkData.items.filter((item) => !item.hidden),
      groupedCategories: groupWerkItems(freshWerkData)
    }
  };
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addWatchTarget("content/");
  eleventyConfig.addWatchTarget("src/_data/werk.json");
  eleventyConfig.addTransform("external-links-new-tab", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    return content.replace(/<a\b(?![^>]*\btarget=)([^>]*\bhref="https?:\/\/[^"]+"[^>]*)>/g, '<a$1 target="_blank" rel="noopener noreferrer">');
  });
  eleventyConfig.addFilter("markdown", renderMarkdown);
  eleventyConfig.addFilter("masterclassEntries", filterMasterclassEntries);
  eleventyConfig.addFilter("byStatus", byStatus);
  eleventyConfig.addFilter("byCategory", byCategory);
  eleventyConfig.addFilter("splitAktuelles", splitAktuelles);
  eleventyConfig.addFilter("upcomingPerformances", upcomingPerformances);
  eleventyConfig.addFilter("hasCategory", hasCategory);
  eleventyConfig.addFilter("chronological", chronological);
  eleventyConfig.addFilter("galleryAfterHero", galleryAfterHero);
  eleventyConfig.addFilter("isExternalUrl", isExternalUrl);
  eleventyConfig.addFilter("creditLabel", creditLabel);
  eleventyConfig.addFilter("groupCastPerformances", groupCastPerformances);

  // Function (not a plain object) so Eleventy re-reads content/*.md and
  // werk.json on every rebuild instead of once at server start — avoids
  // needing a manual server restart after every content edit.
  eleventyConfig.addGlobalData("curatedContent", buildCuratedContent);

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
