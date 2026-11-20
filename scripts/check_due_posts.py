#!/usr/bin/env python3
"""Find recently due Hugo articles and verify their local/live publication."""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content" / "blog"
SITE_BASE = "https://evinsuranceguide.org"
LOCAL_TZ = ZoneInfo("Africa/Lagos")
LOOKBACK_DAYS = 14
FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.S)
FIELD = re.compile(r"^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*?)[ \t]*$", re.M)
SAFE_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class Article:
    path: Path
    slug: str
    scheduled_at: datetime

    @property
    def url(self) -> str:
        return f"{SITE_BASE}/blog/{self.slug}/"


def scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return value.strip()


def read_front_matter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    match = FRONT_MATTER.match(text)
    if not match:
        return {}
    return {key: scalar(value) for key, value in FIELD.findall(match.group(1))}


def parse_local_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=LOCAL_TZ)
    return parsed.astimezone(LOCAL_TZ)


def collect_recent_due_articles(
    content_dir: Path,
    now: datetime,
    lookback_days: int = LOOKBACK_DAYS,
) -> list[Article]:
    now = now.astimezone(LOCAL_TZ)
    earliest_date = now.date() - timedelta(days=lookback_days)
    articles: list[Article] = []

    for path in sorted(content_dir.glob("*.md")):
        fields = read_front_matter(path)
        if fields.get("draft", "false").lower() == "true":
            continue

        date_values = [
            fields[key]
            for key in ("date", "publishDate")
            if fields.get(key)
        ]
        if not date_values:
            continue

        scheduled_at = max(parse_local_datetime(value) for value in date_values)
        if scheduled_at > now or scheduled_at.date() < earliest_date:
            continue

        slug = fields.get("slug") or path.stem
        if not SAFE_SLUG.fullmatch(slug):
            raise ValueError(f"Unsafe or invalid blog slug in {path}: {slug!r}")
        articles.append(Article(path=path, slug=slug, scheduled_at=scheduled_at))

    return articles


def page_is_live(article: Article, timeout: int = 15) -> tuple[bool, int | None]:
    cache_buster = str(time.time_ns())
    request = Request(
        f"{article.url}?publish-check={cache_buster}",
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "EVInsuranceGuide-Publish-Check/1.0",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            body = response.read(128_000).decode("utf-8", errors="replace")
    except HTTPError as error:
        return False, error.code

    return status == 200 and article.url in body, status


def emit_github_outputs(needs_deploy: bool, slugs: list[str]) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as output:
        output.write(f"needs_deploy={'true' if needs_deploy else 'false'}\n")
        output.write(f"missing_slugs={','.join(slugs)}\n")


def check_local_build(site_dir: Path, now: datetime) -> int:
    articles = collect_recent_due_articles(CONTENT_DIR, now)
    missing = [
        article
        for article in articles
        if not (site_dir / "blog" / article.slug / "index.html").is_file()
    ]
    if missing:
        names = ", ".join(article.slug for article in missing)
        print(f"Hugo output is missing recently due article page(s): {names}", file=sys.stderr)
        return 1
    print(f"Hugo output contains all {len(articles)} recently due article page(s).")
    return 0


def check_live_site(now: datetime) -> int:
    articles = collect_recent_due_articles(CONTENT_DIR, now)
    missing: list[Article] = []

    for article in articles:
        try:
            is_live, status = page_is_live(article)
        except (TimeoutError, URLError) as error:
            print(f"Could not verify {article.url}: {error}", file=sys.stderr)
            return 1
        if is_live:
            print(f"LIVE {article.slug}")
        elif status in (404, 200):
            missing.append(article)
            print(f"MISSING {article.slug} (HTTP {status})")
        else:
            print(f"Unexpected HTTP {status} while checking {article.url}", file=sys.stderr)
            return 1

    slugs = [article.slug for article in missing]
    emit_github_outputs(bool(slugs), slugs)
    print(f"needs_deploy={'true' if slugs else 'false'}")
    return 0


def wait_for_live_pages(slugs: list[str], timeout_seconds: int) -> int:
    articles_by_slug = {
        article.slug: article
        for article in collect_recent_due_articles(CONTENT_DIR, datetime.now(LOCAL_TZ))
    }
    articles = [articles_by_slug[slug] for slug in slugs if slug in articles_by_slug]
    if len(articles) != len(slugs):
        print("The workflow supplied a slug that is not currently due.", file=sys.stderr)
        return 1
    if not articles:
        print("No article pages require live verification.")
        return 0

    deadline = time.monotonic() + timeout_seconds
    pending = {article.slug: article for article in articles}
    while pending and time.monotonic() < deadline:
        for slug, article in list(pending.items()):
            try:
                is_live, status = page_is_live(article)
            except (TimeoutError, URLError):
                status = None
                is_live = False
            if is_live:
                print(f"Verified live: {article.url}")
                del pending[slug]
            else:
                print(f"Waiting for {slug} (HTTP {status if status is not None else 'unavailable'})")
        if pending:
            time.sleep(30)

    if pending:
        print(
            "Cloudflare accepted the rebuild request, but these article page(s) "
            f"were not verified live before timeout: {', '.join(sorted(pending))}",
            file=sys.stderr,
        )
        return 1
    print("All due article pages are verified live.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="mode", required=True)

    build_parser = subparsers.add_parser("build", help="verify Hugo generated due pages")
    build_parser.add_argument("--site-dir", type=Path, default=ROOT / "public")

    subparsers.add_parser("live", help="check recent due pages on the public site")

    wait_parser = subparsers.add_parser("wait", help="poll until specified pages are live")
    wait_parser.add_argument("--slugs", required=True)
    wait_parser.add_argument("--timeout-seconds", type=int, default=900)

    args = parser.parse_args()
    now = datetime.now(LOCAL_TZ)
    if args.mode == "build":
        return check_local_build(args.site_dir, now)
    if args.mode == "live":
        return check_live_site(now)
    return wait_for_live_pages(
        [slug for slug in args.slugs.split(",") if slug],
        args.timeout_seconds,
    )


if __name__ == "__main__":
    raise SystemExit(main())
