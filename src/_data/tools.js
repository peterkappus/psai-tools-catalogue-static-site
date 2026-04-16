const fs = require("node:fs/promises");
const path = require("node:path");
const { parse } = require("csv-parse/sync");

function parseUkDateToIso(dateStr) {
  // Expected: dd/mm/yyyy
  const s = String(dateStr ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function normaliseAiMethod(method) {
  const raw = String(method ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  // Keep "Not AI" as a first-class bucket.
  if (lower === "not ai" || lower === "not-a-i" || lower === "non-ai" || lower === "non ai") {
    return "Not AI";
  }

  const map = new Map([
    ["nlp", "Natural Language Processing"],
    ["natural language processing", "Natural Language Processing"],
    ["machine learning", "Machine Learning"],
    ["ml", "Machine Learning"],
    ["computer vision", "Computer Vision"],
    ["cv", "Computer Vision"],
    ["other", "Other"],
  ]);

  // Remove punctuation for matching, but preserve readable output.
  const key = lower.replace(/[().]/g, "").trim();
  return map.get(key) ?? raw;
}

function slugify(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildFacets(tools) {
  function uniquifyFacetSlugs(entries) {
    const seen = new Map();
    for (const e of entries) {
      const base = e.slug || "";
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      if (count > 1) {
        e.slug = `${base}-${count}`;
      }
    }
    return entries;
  }

  function facetFromKey(key) {
    const m = new Map();
    for (const t of tools) {
      const v = t[key];
      if (!v) continue; // missing fields never appear in filtered sets
      const entry = m.get(v) ?? { name: v, slug: slugify(v), tools: [] };
      entry.tools.push(t);
      m.set(v, entry);
    }
    const entries = Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name, "en"));
    return uniquifyFacetSlugs(entries);
  }

  // ai_method is multi-valued; split + normalise.
  const methodsMap = new Map();
  for (const t of tools) {
    for (const m of t.ai_methods) {
      if (!m) continue;
      const key = slugify(m);
      const entry = methodsMap.get(key) ?? { name: m, slug: key, tools: [] };
      entry.tools.push(t);
      methodsMap.set(key, entry);
    }
  }
  const methods = uniquifyFacetSlugs(
    Array.from(methodsMap.values()).sort((a, b) => a.name.localeCompare(b.name, "en")),
  );

  return {
    organisations: facetFromKey("organisation"),
    origins: facetFromKey("origin"),
    statuses: facetFromKey("status"),
    usecases: facetFromKey("usecase"),
    methods,
  };
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function buildPagedToolsList({ basePath, tools, pageSize }) {
  const chunks = chunk(tools, pageSize);
  const totalPages = Math.max(chunks.length, 1);
  return chunks.map((items, idx) => {
    const pageNumber = idx + 1;
    const permalink =
      pageNumber === 1 ? `${basePath}/` : `${basePath}/page/${pageNumber}/`;
    return { permalink, pageNumber, totalPages, tools: items };
  });
}

function buildPagedFacetLists({ facetEntries, basePath, pageSize }) {
  const pages = [];
  for (const entry of facetEntries) {
    const chunks = chunk(entry.tools, pageSize);
    const totalPages = Math.max(chunks.length, 1);
    for (let idx = 0; idx < chunks.length; idx++) {
      const pageNumber = idx + 1;
      const permalink =
        pageNumber === 1
          ? `${basePath}/${entry.slug}/`
          : `${basePath}/${entry.slug}/page/${pageNumber}/`;
      pages.push({
        facetName: entry.name,
        facetSlug: entry.slug,
        permalink,
        pageNumber,
        totalPages,
        tools: chunks[idx],
        totalTools: entry.tools.length,
      });
    }
  }
  return pages;
}

function buildPagedFacetIndex({ facetEntries, basePath, pageSize }) {
  const chunks = chunk(facetEntries, pageSize);
  const totalPages = Math.max(chunks.length, 1);
  return chunks.map((entries, idx) => {
    const pageNumber = idx + 1;
    const permalink =
      pageNumber === 1 ? `${basePath}/` : `${basePath}/page/${pageNumber}/`;
    return { permalink, pageNumber, totalPages, entries };
  });
}

module.exports = async function () {
  const localCsvPath = path.join(process.cwd(), "data", "tools.csv");
  const csvUrl = process.env.CSV_URL && String(process.env.CSV_URL).trim();

  let csvText;
  if (csvUrl) {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`CSV_URL fetch failed: ${res.status} ${res.statusText}`);
    }
    csvText = await res.text();
  } else {
    csvText = await fs.readFile(localCsvPath, "utf8");
  }

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  const items = records.map((r, idx) => {
    const tool_name = String(r.tool_name ?? "").trim();
    const organisation = String(r.organisation ?? "").trim();
    const date_added_raw = String(r.date_added ?? "").trim();

    const ai_methods = String(r.ai_method ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normaliseAiMethod)
      .filter(Boolean);

    const date_added_iso = parseUkDateToIso(date_added_raw);

    const slug_base = slugify(`${tool_name}-${organisation}`);

    return {
      _row: idx + 1,
      ai_method: String(r.ai_method ?? "").trim(),
      ai_methods,
      benefits: String(r.benefits ?? "").trim(),
      date_added: date_added_raw,
      date_added_iso,
      email: String(r.email ?? "").trim(),
      organisation,
      origin: String(r.origin ?? "").trim(),
      owning_team: String(r.owning_team ?? "").trim(),
      scrape_date: String(r.scrape_date ?? "").trim(),
      source_note: String(r.source_note ?? "").trim(),
      source_url: String(r.source_url ?? "").trim(),
      status: String(r.status ?? "").trim(),
      tool_name,
      usecase: String(r.usecase ?? "").trim(),
      slug_base,
      slug: slug_base,
    };
  });

  // Ensure permalinks are unique even if tool_name + organisation repeats.
  // Keep the desired URL shape for the first occurrence; disambiguate duplicates
  // by appending the stable CSV row number.
  const seenSlugs = new Set();
  for (const item of items) {
    if (!item.slug) continue;
    if (!seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      continue;
    }
    const unique = `${item.slug}-${item._row}`;
    item.slug = unique;
    seenSlugs.add(unique);
  }

  // Sort: date desc (missing dates last), then alpha by tool name.
  items.sort((a, b) => {
    const ad = a.date_added_iso || "";
    const bd = b.date_added_iso || "";
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    const n = a.tool_name.localeCompare(b.tool_name, "en");
    if (n !== 0) return n;
    return a.organisation.localeCompare(b.organisation, "en");
  });

  const facets = buildFacets(items);
  const PAGE_SIZE = 10;

  const itemsAz = [...items].sort((a, b) => {
    const n = a.tool_name.localeCompare(b.tool_name, "en");
    if (n !== 0) return n;
    return a.organisation.localeCompare(b.organisation, "en");
  });

  function toLookupByName(entries) {
    const lookup = {};
    for (const e of entries) {
      // If duplicates share the same name, the later one will overwrite.
      // That's fine: it only affects linking, and duplicates should be rare.
      lookup[e.name] = e.slug;
    }
    return lookup;
  }

  return {
    items,
    facets,
    pages: {
      allByDate: buildPagedToolsList({ basePath: "/tools", tools: items, pageSize: PAGE_SIZE }),
      allAz: buildPagedToolsList({ basePath: "/tools/a-z", tools: itemsAz, pageSize: PAGE_SIZE }),
      indexByAiMethod: buildPagedFacetIndex({
        facetEntries: facets.methods,
        basePath: "/browse/by-ai-method",
        pageSize: PAGE_SIZE,
      }),
      indexByOrganisation: buildPagedFacetIndex({
        facetEntries: facets.organisations,
        basePath: "/browse/by-organisation",
        pageSize: PAGE_SIZE,
      }),
      indexByOrigin: buildPagedFacetIndex({
        facetEntries: facets.origins,
        basePath: "/browse/by-origin",
        pageSize: PAGE_SIZE,
      }),
      indexByStatus: buildPagedFacetIndex({
        facetEntries: facets.statuses,
        basePath: "/browse/by-status",
        pageSize: PAGE_SIZE,
      }),
      indexByUsecase: buildPagedFacetIndex({
        facetEntries: facets.usecases,
        basePath: "/browse/by-usecase",
        pageSize: PAGE_SIZE,
      }),
      byAiMethod: buildPagedFacetLists({
        facetEntries: facets.methods,
        basePath: "/browse/by-ai-method",
        pageSize: PAGE_SIZE,
      }),
      byOrganisation: buildPagedFacetLists({
        facetEntries: facets.organisations,
        basePath: "/browse/by-organisation",
        pageSize: PAGE_SIZE,
      }),
      byOrigin: buildPagedFacetLists({
        facetEntries: facets.origins,
        basePath: "/browse/by-origin",
        pageSize: PAGE_SIZE,
      }),
      byStatus: buildPagedFacetLists({
        facetEntries: facets.statuses,
        basePath: "/browse/by-status",
        pageSize: PAGE_SIZE,
      }),
      byUsecase: buildPagedFacetLists({
        facetEntries: facets.usecases,
        basePath: "/browse/by-usecase",
        pageSize: PAGE_SIZE,
      }),
      pageSize: PAGE_SIZE,
    },
    facetLookups: {
      organisationSlugByName: toLookupByName(facets.organisations),
      originSlugByName: toLookupByName(facets.origins),
      statusSlugByName: toLookupByName(facets.statuses),
      usecaseSlugByName: toLookupByName(facets.usecases),
      // Methods are keyed by slug already and are normalised, so we can compute
      // method slugs directly from the tool page (slugify(tag)).
    },
    meta: {
      source: csvUrl ? "remote" : "local",
      csvUrl: csvUrl || null,
      count: items.length,
    },
  };
};

