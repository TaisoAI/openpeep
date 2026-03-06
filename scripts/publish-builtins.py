#!/usr/bin/env python3
"""Publish all built-in peeps to PeepHub.

Usage:
  python scripts/publish-builtins.py [--api-url URL] [--dry-run]

Requires the OpenPeep backend to be running (default: http://localhost:8000).
The backend must have a valid PeepHub API key configured.
"""

import argparse
import json
import sys
from pathlib import Path

import httpx

PEEPS_DIR = Path(__file__).parent.parent / "peeps"


def get_category(manifest: dict) -> str:
    """Derive PeepHub category from capabilities."""
    caps = manifest.get("capabilities", [])
    if "edit" in caps or "save" in caps:
        return "editor"
    if "tools" in caps:
        return "tool"
    if "bundle" in caps:
        return "bundle"
    return "viewer"


def main():
    parser = argparse.ArgumentParser(description="Publish built-in peeps to PeepHub")
    parser.add_argument("--api-url", default="http://localhost:8000", help="OpenPeep backend URL")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be published without doing it")
    args = parser.parse_args()

    api_base = args.api_url.rstrip("/")
    published = 0
    errors = 0

    for peep_dir in sorted(PEEPS_DIR.iterdir()):
        if not peep_dir.is_dir() or peep_dir.name.startswith("_"):
            continue

        manifest_path = peep_dir / "peep.json"
        if not manifest_path.exists():
            continue

        try:
            manifest = json.loads(manifest_path.read_text())
        except Exception as e:
            print(f"  SKIP {peep_dir.name}: invalid peep.json ({e})")
            errors += 1
            continue

        if not manifest.get("builtin"):
            print(f"  SKIP {peep_dir.name}: not marked as builtin")
            continue

        category = get_category(manifest)
        name = manifest.get("name", peep_dir.name)

        if args.dry_run:
            print(f"  DRY RUN: {name} ({peep_dir.name}) → category={category}")
            published += 1
            continue

        print(f"  Publishing {name} ({peep_dir.name})...", end=" ", flush=True)
        try:
            resp = httpx.post(
                f"{api_base}/api/peeps/publish",
                json={
                    "peepPath": str(peep_dir),
                    "category": category,
                    "tags": ["builtin"],
                },
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            version = result.get("version", {}).get("version", "?")
            print(f"OK (v{version})")
            published += 1
        except httpx.HTTPStatusError as e:
            detail = e.response.text
            try:
                detail = e.response.json().get("detail", detail)
            except Exception:
                pass
            print(f"FAILED ({e.response.status_code}: {detail})")
            errors += 1
        except Exception as e:
            print(f"FAILED ({e})")
            errors += 1

    print(f"\nDone: {published} published, {errors} errors")
    return 1 if errors > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
