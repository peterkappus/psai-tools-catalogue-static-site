(() => {
  const PAGE_SIZE = 10;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
  }

  function setParams(params) {
    const u = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || String(v).trim() === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    window.history.replaceState({}, "", u.toString());
  }

  function normaliseTerms(q) {
    return String(q || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(input) {
    return String(input || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function buildPager({ currentPage, totalPages, baseHref }) {
    // baseHref should be /search/?q=... (with no page param), we append &page=
    function hrefFor(p) {
      const u = new URL(baseHref, window.location.origin);
      if (p > 1) u.searchParams.set("page", String(p));
      else u.searchParams.delete("page");
      return u.pathname + u.search;
    }

    const items = [];
    const windowPages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    if (currentPage <= 3) windowPages.add(2);
    if (currentPage >= totalPages - 2) windowPages.add(totalPages - 1);
    const nums = Array.from(windowPages)
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);

    let prev = 0;
    for (const n of nums) {
      if (prev && n - prev > 1) items.push({ ellipsis: true });
      items.push({ number: n, href: hrefFor(n), current: n === currentPage });
      prev = n;
    }

    const prevHref = currentPage > 1 ? hrefFor(currentPage - 1) : null;
    const nextHref = currentPage < totalPages ? hrefFor(currentPage + 1) : null;

    // Render GOV.UK pagination markup (matching component output)
    const parts = [];
    parts.push('<nav class="govuk-pagination" aria-label="Pagination">');

    if (prevHref) {
      parts.push(
        `<div class="govuk-pagination__prev"><a class="govuk-link govuk-pagination__link" href="${prevHref}" rel="prev">` +
          `<svg class="govuk-pagination__icon govuk-pagination__icon--prev" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"><path d="m6.5938-0.0078125-6.7266 6.7266 6.7441 6.4062 1.377-1.449-4.1856-3.9768h12.896v-2h-12.984l4.2931-4.293-1.414-1.414z"></path></svg>` +
          `<span class="govuk-pagination__link-title">Previous<span class="govuk-visually-hidden"> page</span></span>` +
        `</a></div>`,
      );
    }

    parts.push('<ul class="govuk-pagination__list">');
    for (const it of items) {
      if (it.ellipsis) {
        parts.push('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">&ctdot;</li>');
        continue;
      }
      const currentClass = it.current ? " govuk-pagination__item--current" : "";
      const ariaCurrent = it.current ? ' aria-current="page"' : "";
      parts.push(
        `<li class="govuk-pagination__item${currentClass}">` +
          `<a class="govuk-link govuk-pagination__link" href="${it.href}" aria-label="Page ${it.number}"${ariaCurrent}>${it.number}</a>` +
        `</li>`,
      );
    }
    parts.push("</ul>");

    if (nextHref) {
      parts.push(
        `<div class="govuk-pagination__next"><a class="govuk-link govuk-pagination__link" href="${nextHref}" rel="next">` +
          `<span class="govuk-pagination__link-title">Next<span class="govuk-visually-hidden"> page</span></span>` +
          `<svg class="govuk-pagination__icon govuk-pagination__icon--next" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"><path d="m8.107-0.0078125-1.4136 1.414 4.2926 4.293h-12.986v2h12.896l-4.1855 3.9766 1.377 1.4492 6.7441-6.4062-6.7246-6.7266z"></path></svg>` +
        `</a></div>`,
      );
    }

    parts.push("</nav>");
    return parts.join("");
  }

  async function loadIndex() {
    const res = await fetch("/assets/search-index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load search index");
    const json = await res.json();
    // Backwards compatible: allow either [] or { items, lookups }
    if (Array.isArray(json)) return { items: json, lookups: {} };
    return { items: json.items || [], lookups: json.lookups || {} };
  }

  function renderResults({ results, q, pageNumber, totalPages, lookups }) {
    const meta = qs("#search-meta");
    const resultsEl = qs("#search-results");
    const pagerEl = qs("#search-pagination");

    const terms = normaliseTerms(q);
    if (!terms.length) {
      meta.textContent = "";
      resultsEl.innerHTML = "";
      pagerEl.innerHTML = "";
      return;
    }

    meta.textContent = `${results.length} results for “${q}”`;

    const start = (pageNumber - 1) * PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGE_SIZE);

    if (!pageItems.length) {
      resultsEl.innerHTML = `<p class="govuk-body">No results found.</p>`;
      pagerEl.innerHTML = "";
      return;
    }

    const cards = pageItems
      .map((t) => {
        const orgSlug = (lookups.organisationSlugByName || {})[t.organisation];
        const statusSlug = (lookups.statusSlugByName || {})[t.status];
        const orgSlugFallback = t.organisation ? slugify(t.organisation) : "";
        const statusSlugFallback = t.status ? slugify(t.status) : "";

        const orgHtml = orgSlug
          ? `<a class="govuk-link" href="/browse/by-organisation/${escapeHtml(orgSlug)}/">${escapeHtml(t.organisation || "")}</a>`
          : orgSlugFallback
            ? `<a class="govuk-link" href="/browse/by-organisation/${escapeHtml(orgSlugFallback)}/">${escapeHtml(t.organisation || "")}</a>`
          : `${escapeHtml(t.organisation || "")}`;

        const statusHtml = statusSlug
          ? `<a class="govuk-link" href="/browse/by-status/${escapeHtml(statusSlug)}/">${escapeHtml(t.status || "")}</a>`
          : statusSlugFallback
            ? `<a class="govuk-link" href="/browse/by-status/${escapeHtml(statusSlugFallback)}/">${escapeHtml(t.status || "")}</a>`
          : `${escapeHtml(t.status || "")}`;

        const methodsHtml = (t.ai_methods || [])
          .map((m) => {
            const ms = slugify(m);
            return `<a class="govuk-link" href="/browse/by-ai-method/${escapeHtml(ms)}/">${escapeHtml(m)}</a>`;
          })
          .join(", ");

        return (
          `<div class="govuk-summary-card govuk-!-margin-bottom-3">` +
            `<div class="govuk-summary-card__title-wrapper">` +
              `<h2 class="govuk-summary-card__title govuk-heading-m">` +
                `<a class="govuk-link" href="${escapeHtml(t.url)}">${escapeHtml(t.tool_name || "")}</a>` +
              `</h2>` +
            `</div>` +
            `<div class="govuk-summary-card__content">` +
              `<dl class="govuk-summary-list govuk-summary-list--no-border">` +
                `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Organisation</dt><dd class="govuk-summary-list__value">${orgHtml}</dd></div>` +
                `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Status</dt><dd class="govuk-summary-list__value">${statusHtml}</dd></div>` +
                `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">AI method</dt><dd class="govuk-summary-list__value">${methodsHtml}</dd></div>` +
                `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Date added</dt><dd class="govuk-summary-list__value">${escapeHtml(t.date_added || "")}</dd></div>` +
              `</dl>` +
            `</div>` +
          `</div>`
        );
      })
      .join("");

    resultsEl.innerHTML = cards;

    if (totalPages > 1) {
      const u = new URL(window.location.href);
      u.searchParams.delete("page");
      pagerEl.innerHTML = buildPager({
        currentPage: pageNumber,
        totalPages,
        baseHref: u.pathname + u.search,
      });
    } else {
      pagerEl.innerHTML = "";
    }
  }

  function filterIndex(index, q) {
    const terms = normaliseTerms(q);
    if (!terms.length) return [];
    return index.filter((t) => terms.every((term) => String(t.rowText || "").includes(term)));
  }

  function clampPage(p, totalPages) {
    const n = Number(p) || 1;
    if (n < 1) return 1;
    if (n > totalPages) return totalPages;
    return n;
  }

  async function main() {
    const input = qs("#search-q");
    const submit = qs("#search-submit");

    if (!input || !submit) return;

    const q = getParam("q");
    const pageParam = getParam("page");
    input.value = q;

    let items = [];
    let lookups = {};
    try {
      const loaded = await loadIndex();
      items = loaded.items;
      lookups = loaded.lookups || {};
    } catch (e) {
      qs("#search-meta").textContent = "Search index could not be loaded.";
      return;
    }

    function run() {
      const currentQ = input.value || "";
      setParams({ q: currentQ, page: null });
      const results = filterIndex(items, currentQ);
      const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
      renderResults({ results, q: currentQ, pageNumber: 1, totalPages, lookups });
    }

    function runFromUrl() {
      const currentQ = getParam("q");
      input.value = currentQ;
      const results = filterIndex(items, currentQ);
      const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
      const pageNumber = clampPage(getParam("page"), totalPages);
      renderResults({ results, q: currentQ, pageNumber, totalPages, lookups });
    }

    submit.addEventListener("click", run);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run();
      }
    });

    window.addEventListener("popstate", runFromUrl);
    runFromUrl();
  }

  document.addEventListener("DOMContentLoaded", main);
})();

