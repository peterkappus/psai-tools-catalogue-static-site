## Deployment

### Build output

The static site is written to:

- `_site/`

Upload the contents of `_site/` to your static hosting platform (for example S3 + CloudFront).

### Build command

```bash
npm ci
npm run build
```

### Optional remote CSV

You can build against a remote CSV URL:

```bash
CSV_URL="https://example.org/tools.csv" npm run build
```

