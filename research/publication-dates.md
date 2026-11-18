# Publication timestamps and automatic publication

- The site uses Africa/Lagos (UTC+01:00) and excludes future posts.
- Article front matter uses explicit ISO 8601 timestamps for `date`,
  `publishDate` and `lastmod`.
- Original calendar publication dates are preserved. Where an inherited source
  had only a calendar date, midnight in the site timezone is a normalization
  convention, not a claim to know its historical exact publication minute.
- BlogPosting, collection entries, Open Graph article dates, HTML time elements
  and sitemap modification dates emit full timezone-aware timestamps.
- Collection pages are not marked as individual BlogPosting articles.
- Visible byline dates and structured timestamps refer to the same calendar day.
- Modification dates are editorial dates, never refreshed just because the site
  rebuilds. Rebuilding alone is not a content modification.
- Google recommends timezone information and consistency. This change does not
  guarantee that all Search Console warnings disappear or that Google selects a
  particular search-result date.
- References checked November 17, 2026:
  https://developers.google.com/search/docs/appearance/structured-data/article
  https://developers.google.com/search/docs/appearance/publication-dates
- A scheduled Cloudflare rebuild is required for future articles to become
  public. File dates alone do not run a static-site build.
