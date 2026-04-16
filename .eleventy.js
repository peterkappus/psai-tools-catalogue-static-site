const { DateTime } = require("luxon");
const nunjucks = require("nunjucks");

function slugify(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "dist/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/govuk-frontend/dist/govuk/assets": "assets/govuk/assets",
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.js":
      "assets/govuk/govuk-frontend.min.js",
  });

  // MOJ Frontend (optional components)
  eleventyConfig.addPassthroughCopy({
    "node_modules/@ministryofjustice/frontend/moj/assets": "assets/moj/assets",
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/@ministryofjustice/frontend/moj/moj-frontend.min.js":
      "assets/moj/moj-frontend.min.js",
  });

  eleventyConfig.addFilter("slug", slugify);

  eleventyConfig.addFilter("formatDateUK", (value) => {
    if (!value) return "";
    // value should be ISO date string (yyyy-mm-dd)
    const dt = DateTime.fromISO(String(value), { zone: "utc" });
    return dt.isValid ? dt.toFormat("d LLLL yyyy") : "";
  });

  eleventyConfig.addFilter("csvTags", (value) => {
    if (!value) return [];
    return String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });

  eleventyConfig.addFilter("paginationItems", (totalPages, currentPage, basePermalink) => {
    const total = Number(totalPages) || 0;
    const current = Number(currentPage) || 1;
    const base = String(basePermalink || "/").replace(/\/?$/, "/");

    function hrefFor(pageNum) {
      if (pageNum <= 1) return base;
      return `${base}page/${pageNum}/`;
    }

    if (total <= 1) return [];

    // Build a GOV.UK pagination items array with ellipses.
    // Pattern:
    // - Always show first page
    // - Show pages around the current page
    // - Always show last page
    const items = [];

    function pushPage(n) {
      items.push({ number: n, href: hrefFor(n), current: n === current });
    }
    function pushEllipsis() {
      items.push({ ellipsis: true });
    }

    const windowPages = new Set([1, total, current - 1, current, current + 1]);
    // Also include page 2 and last-1 when close to edges, to reduce ellipses.
    if (current <= 3) windowPages.add(2);
    if (current >= total - 2) windowPages.add(total - 1);

    const nums = Array.from(windowPages)
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);

    let prev = 0;
    for (const n of nums) {
      if (prev && n - prev > 1) {
        pushEllipsis();
      }
      pushPage(n);
      prev = n;
    }

    return items;
  });

  // Make GOV.UK Frontend + MOJ Frontend Nunjucks macros available to templates.
  const njkEnv = nunjucks.configure(
    [
      "src/_includes",
      "node_modules/govuk-frontend/dist",
      "node_modules/@ministryofjustice/frontend",
    ],
    {
      autoescape: true,
      throwOnUndefined: false,
    },
  );
  eleventyConfig.setLibrary("njk", njkEnv);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};

