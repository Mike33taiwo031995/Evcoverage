# Evcoverage
Electric Vehicle 3 insurance mistake in 2026

Source for [evinsuranceguide.org](https://evinsuranceguide.org/), an independent EV insurance education site built with [Hugo](https://gohugo.io/). It uses custom templates, with no theme.

## Layout
- `content/`: Markdown pages. Articles live in `content/blog/`.
- `layouts/`: Hugo templates (`_default/baseof.html` holds the shared head, nav and footer; `index.html` is the homepage).
- `static/`: files copied as-is (homepage CSS/JS, `free-guide.html`, `thank-you.html`).
- `config.toml`: site settings and tracking IDs.

## Adding an article
Create `content/blog/<slug>.md` with this front matter:

```
---
title: ""
description: ""
slug: ""
date: YYYY-MM-DD
lastmod: YYYY-MM-DD
author: "EV Insurance Guide"
draft: false
---
```

Use `{{< adslot 1 >}}`, `{{< adslot 2 >}}` and `{{< adslot 3 >}}` in the body (slot 3 is the free-guide CTA).

## Local preview
Run `hugo server`.
