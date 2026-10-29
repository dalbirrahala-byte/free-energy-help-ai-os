#!/usr/bin/env python3
"""OFFLINE ONLY: prepare 61 FEH staging SQL files from a separate pinned checkout.

NO SQL execution, NO Supabase/Vercel/Telnyx calls, NO network, NO credential
reads, NO production writes. Script lives in this review PR, but its *repo*
argument must be an independent, clean checkout at the pinned source commit.
It will not modify that checkout. NEVER use the generated SQL without a new
human approval and staging-only security preflight.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess

PIN = "92e1044a9d2426d7910c0e50cc39865a7b2a6097"
STAGING_PROJECT = "vredwhyphrhsudggrsen"  # documentation only; NOT used in commands
COUNT = 61
SOURCE_SQL_COUNT = 63
EXCLUDE = {
    "20260826100000_authoritative_prepared_envelope_checkpoint.sql",
    "20260828120000_prepared_dispatch_destination_binding.sql",
}
HEALTH_SOURCE = "20260831120000_health_check_crm_persistence.sql"
HEALTH_TARGET = "20260901124827_health_check_crm_persistence.sql"


def stop(why: str) -> None:
    raise SystemExit("STOP (no SQL applied): " + why)


def git(repo: Path, *args: str) -> str:
    # Git reads the local checkout only; no git fetch/pull/clone/rebase.
    cp = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True, capture_output=True, check=False,
    )
    if cp.returncode:
        stop("git preflight failed: " + " ".join(args))
    return cp.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare only an offline, production-aligned FEH staging migration tree"
    )
    parser.add_argument("repo", type=Path, help="clean source checkout at pinned main commit")
    parser.add_argument("output", type=Path, help="NEW directory outside source checkout")
    args = parser.parse_args()

    repo = args.repo.expanduser().resolve(strict=True)
    out = args.output.expanduser().resolve()
    # Git for Windows may print C:/Projects/... while pathlib prints
    # C:\\Projects\\... . Compare normalized paths, not raw separators.
    reported_root = Path(git(repo, "rev-parse", "--show-toplevel")).resolve()
    if reported_root != repo:
        stop("repo argument must be the checkout root")
    if git(repo, "rev-parse", "HEAD") != PIN:
        stop("source checkout HEAD is not the audited source commit")
    if git(repo, "status", "--porcelain"):
        stop("source checkout has tracked/untracked modifications")
    if out == repo or repo in out.parents or out in repo.parents:
        stop("output cannot be inside or above source checkout")
    if out.exists():
        stop("output directory already exists; no overwrite")

    source_dir = repo / "supabase" / "migrations"
    if not source_dir.is_dir():
        stop("source migrations directory missing")
    all_source = {p.name for p in source_dir.glob("*.sql") if p.is_file()}
    if len(all_source) != SOURCE_SQL_COUNT:
        stop("source SQL count drifted; expected exactly 63")

    manifest = Path(__file__).with_name("staging_61_manifest.csv")
    with manifest.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    expected_columns = {
        "order", "production_version", "name", "source_git_path",
        "source_blob_sha", "staging_filename", "phase", "risk_flags", "notes",
    }
    if len(rows) != COUNT or not all(expected_columns.issubset(r) for r in rows):
        stop("manifest does not contain exactly 61 correctly structured rows")
    if [int(r["order"]) for r in rows] != list(range(1, COUNT + 1)):
        stop("manifest order is invalid")

    versions = [r["production_version"] for r in rows]
    destinations = [r["staging_filename"] for r in rows]
    sources = [Path(r["source_git_path"]).name for r in rows]
    if len(set(versions)) != COUNT or versions != sorted(versions):
        stop("manifest has duplicate or out-of-order production versions")
    if len(set(sources)) != COUNT or len(set(destinations)) != COUNT:
        stop("duplicate source/destination filename")
    if set(sources) | EXCLUDE != all_source or (set(sources) & EXCLUDE):
        stop("source list is not exactly 61 files plus the two held-back files")
    if sources[-1] != HEALTH_SOURCE or destinations[-1] != HEALTH_TARGET:
        stop("Health Check alias must be exactly production-recorded version")
    if any(r["staging_filename"] != r["production_version"] + "_" + r["name"] + ".sql" for r in rows):
        stop("staging filename does not agree with production-recorded migration")

    planned: list[tuple[str, bytes, str]] = []
    for r in rows:
        rel = Path(r["source_git_path"])
        if rel.is_absolute() or ".." in rel.parts or rel.parts[:2] != ("supabase", "migrations"):
            stop("unsafe source path")
        src = repo / rel
        if src.is_symlink() or not src.is_file():
            stop("missing or symlinked SQL source")
        actual_blob_sha = git(repo, "hash-object", "--", str(rel))
        if actual_blob_sha != r["source_blob_sha"]:
            stop("Git blob SHA does not match manifest for " + src.name)
        data = src.read_bytes()
        if not data or b"\x00" in data:
            stop("empty or binary SQL source")
        planned.append((r["staging_filename"], data, str(rel)))

    # All checks above are read-only. Only now may a NEW local output be created.
    (out / "supabase" / "migrations").mkdir(parents=True, exist_ok=False)
    hashes = []
    for filename, data, source in planned:
        dest = out / "supabase" / "migrations" / filename
        dest.write_bytes(data)
        hashes.append({
            "file": "supabase/migrations/" + filename,
            "sha256": hashlib.sha256(data).hexdigest(),
            "source": source,
        })
    (out / "sha256_manifest.json").write_text(
        json.dumps(hashes, indent=2) + "\n", encoding="utf-8"
    )
    (out / "REVIEW_ONLY_NO_SQL_EXECUTED.txt").write_text(
        "Files prepared offline. No database contacted, no SQL executed.\n"
        "DO NOT APPLY without new owner approval and target verification.\n",
        encoding="utf-8",
    )
    assert len(list((out / "supabase" / "migrations").glob("*.sql"))) == COUNT
    print("OFFLINE ONLY: 61 version-aligned SQL files prepared and SHA256 recorded.")
    print("No SQL executed. Staging-only deployment still requires separate approval.")


if __name__ == "__main__":
    main()
