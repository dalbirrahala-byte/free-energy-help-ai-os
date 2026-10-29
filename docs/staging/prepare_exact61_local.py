#!/usr/bin/env python3
"""FEH isolated exact-61 local Supabase preparation and optional test.

REVIEW ONLY; never deploys to cloud. No production/staging project refs,
credentials, linked-project commands, database resets, or shared Docker changes.
This deliberately preserves the existing local source-63 test database.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys

REVIEW_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE = REVIEW_ROOT.parent
PIN = "92e1044a9d2426d7910c0e50cc39865a7b2a6097"
SOURCE = WORKSPACE / "feh-staging61-source-pin"
OUTPUT = WORKSPACE / "feh-staging61-local"
PROJECT = "feh-staging-61-local"
CONTAINER = "supabase_db_" + PROJECT
PREPARER = REVIEW_ROOT / "docs/staging/prepare_staging_migrations.py"
VALIDATOR = REVIEW_ROOT / "docs/staging/validate_local_permissions.py"
PORTS = (54420, 54421, 54422, 54423)
# Only PostgreSQL is needed for the SQL assertions.
EXCLUDED = (
    "gotrue", "realtime", "storage-api", "imgproxy", "kong", "mailpit",
    "postgrest", "postgres-meta", "studio", "edge-runtime", "logflare",
    "vector", "supavisor",
)
CONFIG = """# LOCAL Docker-only staging-61 parity test; never link to cloud.
project_id = "feh-staging-61-local"

[api]
enabled = false
port = 54421

[db]
port = 54422
shadow_port = 54420
major_version = 17

[studio]
enabled = false
port = 54423
"""


class Stop(Exception):
    pass


def require(ok: bool, why: str) -> None:
    if not ok:
        raise Stop(why)


def run(args: list[str], *, cwd: Path | None = None, timeout: int = 180,
        scrub_cloud_env: bool = False) -> str:
    env = os.environ.copy()
    if scrub_cloud_env:
        for key in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD",
                    "SUPABASE_PROJECT_ID", "DATABASE_URL",
                    "PGHOST", "PGPORT", "PGUSER", "PGPASSWORD"):
            env.pop(key, None)
    try:
        result = subprocess.run(
            args, cwd=str(cwd) if cwd else str(REVIEW_ROOT), env=env,
            text=True, encoding="utf-8", errors="replace",
            capture_output=True, check=False, timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Stop("Local command did not finish: " + args[0]
                   + " (" + type(exc).__name__ + ")") from exc
    if result.returncode != 0:
        raise Stop("Local command failed (" + args[0]
                   + ", exit " + str(result.returncode) + "): "
                   + (result.stdout + result.stderr)[-2500:])
    return result.stdout.strip()


def validate_workspace() -> None:
    require(REVIEW_ROOT.name == "feh-security-review",
            "Expected the dedicated feh-security-review worktree")
    root = Path(run(["git", "-C", str(REVIEW_ROOT),
                     "rev-parse", "--show-toplevel"])).resolve()
    require(root == REVIEW_ROOT.resolve(),
            "Review script is outside the expected review worktree")
    require(WORKSPACE == SOURCE.parent == OUTPUT.parent,
            "Local working directories must be siblings of review worktree")
    require(PREPARER.is_file() and VALIDATOR.is_file(),
            "Reviewed preparation or validation scripts missing")
    script = PREPARER.read_text(encoding="utf-8")
    require(f'PIN = "{PIN}"' in script and "COUNT = 61" in script,
            "61-migration source pin or count changed unexpectedly")
    runner = VALIDATOR.read_text(encoding="utf-8")
    require('"approved-staging-61": "supabase_db_feh-staging-61-local"' in runner,
            "Local validator's exact-61 target does not match this project")


def git_source() -> None:
    if not SOURCE.exists():
        # No fetch or remote access. PIN must already exist in the local clone.
        run(["git", "-C", str(REVIEW_ROOT), "cat-file", "-e",
             PIN + "^{commit}"], timeout=15)
        run(["git", "-C", str(REVIEW_ROOT), "worktree", "add", "--detach",
             str(SOURCE), PIN], timeout=120)
    require(SOURCE.is_dir(), "Pinned source directory missing")
    require(run(["git", "-C", str(SOURCE), "rev-parse", "HEAD"]) == PIN,
            "Source worktree is not at the approved pinned commit")
    require(not run(["git", "-C", str(SOURCE), "status", "--porcelain"]),
            "Pinned source worktree is not clean")
    print("PASS: pinned clean source migration worktree", flush=True)


def verify_prepared() -> None:
    manifest = OUTPUT / "sha256_manifest.json"
    require(manifest.is_file(), "Prepared 61-migration manifest missing")
    try:
        rows = json.loads(manifest.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        raise Stop("Cannot parse prepared checksum manifest") from exc
    require(isinstance(rows, list) and len(rows) == 61,
            "Prepared manifest must contain exactly 61 records")
    names: set[str] = set()
    for row in rows:
        rel = Path(row["file"])
        require(not rel.is_absolute() and ".." not in rel.parts
                and rel.parts[:2] == ("supabase", "migrations"),
                "Unsafe migration path in prepared manifest")
        source = OUTPUT / rel
        require(source.is_file() and not source.is_symlink(),
                "Prepared migration missing or symlinked: " + str(rel))
        require(hashlib.sha256(source.read_bytes()).hexdigest() == row["sha256"],
                "Prepared migration SHA256 mismatch: " + str(rel))
        names.add(rel.name)
    actual = {p.name for p in (OUTPUT / "supabase/migrations").glob("*.sql")}
    require(len(names) == 61 and names == actual,
            "Prepared files differ from the exact 61-row manifest")
    config = OUTPUT / "supabase/config.toml"
    if not config.exists():
        config.write_text(CONFIG, encoding="utf-8")
    require(config.read_text(encoding="utf-8") == CONFIG,
            "Local Supabase config differs: STOP, do not overwrite")
    print("PASS: exact 61 migration SHA256 files and isolated config", flush=True)


def prepare() -> None:
    validate_workspace()
    git_source()
    if not OUTPUT.exists():
        print("Preparing 61 reviewed migrations offline ...", flush=True)
        run([sys.executable, str(PREPARER), str(SOURCE), str(OUTPUT)],
            timeout=180)
    require(OUTPUT.is_dir(), "Expected dedicated local output directory")
    verify_prepared()


def docker_local_running() -> bool:
    docker = shutil.which("docker")
    require(docker is not None, "Docker Desktop unavailable")
    context = run([docker, "context", "show"], timeout=15)
    require(context in ("default", "desktop-linux"),
            "Docker context is not a local Desktop context")
    remote = os.environ.get("DOCKER_HOST", "")
    require(not remote or remote.startswith(("npipe:", "unix:")),
            "Remote DOCKER_HOST is prohibited")
    result = subprocess.run(
        [docker, "inspect", "--format", "{{.State.Running}}", CONTAINER],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode == 0:
        require(result.stdout.strip() == "true",
                "Local-61 container exists but is stopped; no automatic restart")
        return True
    return False


def check_ports() -> None:
    for port in PORTS:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError as exc:
                raise Stop(f"Local port {port} is occupied; "
                           "no other Docker project will be stopped") from exc


def start_and_test() -> None:
    if not docker_local_running():
        check_ports()
        npx = shutil.which("npx.cmd") or shutil.which("npx")
        require(npx is not None, "Node npx is not installed")
        print("Starting a new local PostgreSQL 17 test environment ...",
              flush=True)
        # 'start' is local only. No link, db push, db reset, project refs,
        # database URLs, secrets or cloud endpoints are used.
        run([npx, "--yes", "supabase@2.111.0", "start",
             "--workdir", str(OUTPUT),
             "--exclude", ",".join(EXCLUDED)],
            cwd=OUTPUT, timeout=1200, scrub_cloud_env=True)
    else:
        print("PASS: dedicated local-61 Docker container already running",
              flush=True)
    print("Running exact-61 rollback-only SQL test ...", flush=True)
    result = run([sys.executable, str(VALIDATOR),
                  "--profile", "approved-staging-61"],
                 cwd=REVIEW_ROOT, timeout=240, scrub_cloud_env=True)
    # This is only a local diagnostic; never print PASS on a nonzero result.
    require("PASS: all 20 synthetic assertions reported success after rollback" in result,
            "Local validator returned without the explicit 20/20 success marker")
    print(result, flush=True)
    print("PASS: isolated exact-61 local diagnostic complete", flush=True)
    print("Cloud staging and production have not been contacted.", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-and-test", action="store_true",
                        help="Start a separate Docker project and run 20 rollback-only assertions")
    args = parser.parse_args()
    prepare()
    if args.start_and_test:
        start_and_test()
    else:
        print("PASS: offline 61-migration package prepared; no database contacted")
        print("Next: python " + str(Path(__file__)) + " --start-and-test")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Stop as exc:
        print("STOP: " + str(exc), file=sys.stderr)
        sys.exit(1)
