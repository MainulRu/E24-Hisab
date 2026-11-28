#!/usr/bin/env python3
"""Sync canonical shared JavaScript into the Web and Android app trees."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "shared" / "js"
TARGETS = (
    ROOT / "docs" / "js",
    ROOT / "app" / "src" / "main" / "assets" / "js",
)
FILES = ("customer.js", "notification.js", "setting.js", "transaction.js")


def main():
    for name in FILES:
        source = SHARED / name
        if not source.is_file():
            raise SystemExit(f"Missing shared JavaScript source: {source}")
        content = source.read_text(encoding="utf-8")
        for target_dir in TARGETS:
            target_dir.mkdir(parents=True, exist_ok=True)
            (target_dir / name).write_text(content, encoding="utf-8")
    print("Shared JavaScript synced to Web and Android.")


if __name__ == "__main__":
    main()
