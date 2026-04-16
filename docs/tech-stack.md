## Tech stack

### Core

- Eleventy (11ty) (Nunjucks templates)
- GOV.UK Frontend (Nunjucks macros + SCSS)
- Node + npm (build-time only; output is static HTML/CSS/JS)

### Data

- CSV parsing: `csv-parse`
- Dates: `luxon` (UK date formatting + sorting)

### Styling / assets

- Sass compilation to `dist/assets/css/app.css`
- GOV.UK assets are copied to `_site/assets/govuk/assets`

### Search

- Client-side JavaScript search using a generated JSON index:
  - Generated at build time: `src/search-index.json.njk` → `_site/assets/search-index.json`
  - UI: `src/search/index.njk` and header search form
  - Logic: `src/assets/js/search.js`

