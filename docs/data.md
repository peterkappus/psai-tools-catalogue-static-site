## Data (CSV)

### Location

- Local CSV: `data/tools.csv`

### Update process

1. Replace or edit `data/tools.csv`
2. Rebuild the site:

```bash
npm run build
```

### Required headers

The CSV must contain these headers:

- `ai_method,benefits,date_added,email,organisation,origin,owning_team,scrape_date,source_note,source_url,status,tool_name,usecase`

### Notes

- `ai_method` is split on commas into tags and normalised for browsing.
- Missing facet fields are excluded from facet lists.
- Duplicate `tool_name + organisation` rows are automatically disambiguated in permalinks.

