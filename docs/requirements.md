## Requirements (summary)

### Site

- Static site built with Eleventy using GOV.UK Design System Nunjucks and styles.
- Crown header and GOV.UK service navigation:
  - Service name: Public sector AI Tools Catalogue”
  - Link: About
- WCAG 2.2 AA.
- Dismissible cookie banner that remembers Accept/Reject.
- Optional GA4 placeholder support.

### Data model

- Each CSV row is a canonical tool entry (no merging).
- Tool permalink:
  - `/tools/<slug(tool_name)>-<slug(organisation)>/`
  - If duplicates exist, suffix `-<rowNumber>` is appended to avoid collisions.

### Browsing

Home provides tabbed navigation to:
- All tools
- By AI method
- By organisation
- By origin
- By status
- By usecase

Browse index pages list facet values + tool counts and are paginated when needed.
Browse value pages list tools (with metadata) and are paginated when >10 tools.

### Filtering rules

- Missing fields do not appear in facet lists (exact-match only).
- AI methods are split on commas, trimmed, and synonyms are normalised where possible.
- “Not AI” is retained as a bucket.

### Search

- Global free-text search box in the header.
- Client-side search (static hosting compatible).
- Query split by whitespace into terms; **all terms must match** somewhere in the tool row.
- Search results are paginated (10 per page).

