#!/usr/bin/env python3
"""Assemble page fragments into the single DOM required by E24 Hisab."""
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-file", required=True)
    args = parser.parse_args()
    source = Path(args.source_dir)
    template = (source / "index.html").read_text(encoding="utf-8")
    pages = {"1": "home.html"}
    for page_id, filename in pages.items():
        marker = f"<!-- E24_PAGE:{page_id} -->"
        if template.count(marker) != 1:
            raise SystemExit(f"Expected exactly one marker: {marker}")
        fragment_path = source / "pages" / filename
        if not fragment_path.is_file():
            raise SystemExit(f"Missing page fragment: {fragment_path}")
        fragment = fragment_path.read_text(encoding="utf-8")
        if f'id="page-{page_id}"' not in fragment:
            raise SystemExit(f"Page fragment has no page-{page_id} root")
        template = template.replace(marker, fragment)
    output = Path(args.output_file)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(template, encoding="utf-8")

if __name__ == "__main__":
    main()
