# AI tools catalogue (static)

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

