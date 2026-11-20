import tempfile
import unittest
from datetime import datetime
from unittest.mock import patch
from urllib.error import HTTPError
from pathlib import Path
from zoneinfo import ZoneInfo

from scripts.check_due_posts import (
    Article,
    collect_recent_due_articles,
    page_is_live,
    parse_local_datetime,
    read_front_matter,
)


LAGOS = ZoneInfo("Africa/Lagos")


class FakeResponse:
    status = 200

    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _limit):
        return self.body


class DuePostTests(unittest.TestCase):
    def test_parse_iso_date_with_lagos_offset(self):
        parsed = parse_local_datetime("2026-11-20T00:00:00+01:00")
        self.assertEqual(parsed.isoformat(), "2026-11-20T00:00:00+01:00")

    def test_only_recent_published_articles_are_selected(self):
        now = datetime(2026, 11, 20, 0, 10, tzinfo=LAGOS)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "due.md").write_text(
                '---\ntitle: Due\nslug: due-article\ndate: 2026-11-20T00:00:00+01:00\n'
                'publishDate: 2026-11-20T00:00:00+01:00\ndraft: false\n---\nBody\n',
                encoding="utf-8",
            )
            (root / "future.md").write_text(
                '---\ntitle: Future\nslug: future-article\ndate: 2026-11-21T00:00:00+01:00\n'
                'publishDate: 2026-11-21T00:00:00+01:00\ndraft: false\n---\nBody\n',
                encoding="utf-8",
            )
            (root / "draft.md").write_text(
                '---\ntitle: Draft\nslug: draft-article\ndate: 2026-11-20T00:00:00+01:00\n'
                'draft: true\n---\nBody\n',
                encoding="utf-8",
            )
            (root / "old.md").write_text(
                '---\ntitle: Old\nslug: old-article\ndate: 2026-10-01T00:00:00+01:00\n'
                'draft: false\n---\nBody\n',
                encoding="utf-8",
            )

            selected = collect_recent_due_articles(root, now, lookback_days=14)

        self.assertEqual([article.slug for article in selected], ["due-article"])

    def test_later_publish_date_controls_eligibility(self):
        now = datetime(2026, 11, 20, 0, 10, tzinfo=LAGOS)
        with tempfile.TemporaryDirectory() as directory:
            post = Path(directory) / "delayed.md"
            post.write_text(
                '---\ntitle: Delayed\nslug: delayed-article\n'
                'date: 2026-11-19T00:00:00+01:00\n'
                'publishDate: 2026-11-20T00:30:00+01:00\ndraft: false\n---\nBody\n',
                encoding="utf-8",
            )
            self.assertEqual(collect_recent_due_articles(Path(directory), now), [])

    def test_front_matter_values_are_read_without_yaml_dependency(self):
        with tempfile.TemporaryDirectory() as directory:
            post = Path(directory) / "quoted.md"
            post.write_text(
                '---\ntitle: "Quoted title"\nslug: "quoted-title"\ndraft: false\n---\n',
                encoding="utf-8",
            )
            fields = read_front_matter(post)
        self.assertEqual(fields["title"], "Quoted title")
        self.assertEqual(fields["slug"], "quoted-title")

    def test_live_check_requires_the_expected_canonical_url(self):
        article = Article(
            path=Path("article.md"),
            slug="sample-article",
            scheduled_at=datetime(2026, 11, 20, tzinfo=LAGOS),
        )
        body = f'<link rel="canonical" href="{article.url}">'.encode()
        with patch("scripts.check_due_posts.urlopen", return_value=FakeResponse(body)):
            self.assertEqual(page_is_live(article), (True, 200))

    def test_live_check_rejects_generic_404_html_served_with_status_200(self):
        article = Article(
            path=Path("article.md"),
            slug="sample-article",
            scheduled_at=datetime(2026, 11, 20, tzinfo=LAGOS),
        )
        with patch(
            "scripts.check_due_posts.urlopen",
            return_value=FakeResponse(b'<link rel="canonical" href="https://example.com/404.html">'),
        ):
            self.assertEqual(page_is_live(article), (False, 200))

    def test_live_check_reports_http_404(self):
        article = Article(
            path=Path("article.md"),
            slug="sample-article",
            scheduled_at=datetime(2026, 11, 20, tzinfo=LAGOS),
        )
        error = HTTPError(article.url, 404, "Not Found", {}, None)
        with patch("scripts.check_due_posts.urlopen", side_effect=error):
            self.assertEqual(page_is_live(article), (False, 404))


if __name__ == "__main__":
    unittest.main()
