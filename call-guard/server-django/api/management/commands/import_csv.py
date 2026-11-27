import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from api.hk_phone import normalize_hk_e164
from api.models import SpamNumber
from api.views import CATEGORY_LABELS, upsert_spam_number


class Command(BaseCommand):
    help = "Import prebuilt HK blocklist CSV (same file as Node server)."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            nargs="?",
            default=str(
                Path(__file__).resolve().parents[4]
                / "server"
                / "data"
                / "prebuilt-hk-blocklist.csv"
            ),
        )

    def handle(self, *args, **options):
        path = Path(options["csv_path"])
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"CSV not found: {path}"))
            return

        ok = 0
        skip = 0
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                category = (row.get("category") or "").strip()
                if category not in CATEGORY_LABELS:
                    skip += 1
                    continue
                e164 = normalize_hk_e164(row.get("e164")) or (row.get("e164") or "").strip()
                if not e164.startswith("+"):
                    skip += 1
                    continue
                conf = float(row.get("confidence") or 0.8)
                upsert_spam_number(
                    e164=e164,
                    category=category,
                    label_zh=row.get("label_zh") or CATEGORY_LABELS[category],
                    confidence=conf,
                    source=row.get("source") or "csv-import",
                )
                ok += 1

        total = SpamNumber.objects.filter(region="HK").count()
        self.stdout.write(
            self.style.SUCCESS(f"Imported {ok} (skipped {skip}). HK blocklist size: {total}")
        )
