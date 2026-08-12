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
      .filter((item) => item.category === category.slug)
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
      items: freshWerkData.items,
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
  eleventyConfig.addFilter("hasCategory", hasCategory);
  eleventyConfig.addFilter("chronological", chronological);
  eleventyConfig.addFilter("galleryAfterHero", galleryAfterHero);
  eleventyConfig.addFilter("isExternalUrl", isExternalUrl);
  eleventyConfig.addFilter("creditLabel", creditLabel);

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
