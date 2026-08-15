# Public sector AI tools catalogue (static)

Static site built with [Eleventy (11ty)](https://www.11ty.dev/) using the GOV.UK Design System (Nunjucks components + GOV.UK styles).

## Data

- Default: reads `data/tools.csv` from this repository.
- Optional: set `CSV_URL` to fetch a CSV at build time (for example from another server).

The CSV must include the headers shown in the example snippet:

- `ai_method,benefits,date_added,email,organisation,origin,owning_team,scrape_date,source_note,source_url,status,tool_name,usecase`

### Remote CSV option

When `CSV_URL` is set, the build will fetch the CSV and use it instead of the local file.

```bash
CSV_URL="https://example.org/tools.csv" npm run build
```

## Develop

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Build

```bash
npm run build
```

Output is written to `_site/` for static hosting (S3, etc).

## GOV.UK Frontend JavaScript (v6)

`govuk-frontend.min.js` is an **ES module**. It must be loaded with `type="module"`:

```html
<script type="module">
  import { initAll } from "/assets/govuk/govuk-frontend.min.js";
  initAll();
</script>
```

If you load it as a classic `<script src="…">`, the browser throws:

`Uncaught SyntaxError: Unexpected token 'export'`

The old `window.GOVUKFrontend.initAll()` pattern does not apply to v6.

## Fonts and favicon (not hosted on GOV.UK)

This site is **not** a GOV.UK-hosted service, so it must **not** use:

- **GDS Transport** (the GOV.UK font)
- The **GOV.UK crown favicon**

Typography is **Schibsted Grotesk** (Google Fonts), compiled into GOV.UK Frontend via `$govuk-font-family` in `src/assets/scss/app.scss`. Headings use `font-weight: 700`.

The crown icons are not linked. Favicon is `src/assets/favicon.svg`, copied to `/assets/favicon.svg`.

## CSS during local development

`npm run build` compiles Sass to `dist/assets/css/`, then Eleventy copies that into `_site/assets/`.

`npm run dev` watches Sass into the **same** `dist/assets/css/` folder so Eleventy can copy it on change. If watch writes straight into `_site/` while Eleventy also copies `dist/assets`, you can end up with **stale CSS** (different fonts locally vs production). Restart `npm run dev` after pulling CSS changes.

