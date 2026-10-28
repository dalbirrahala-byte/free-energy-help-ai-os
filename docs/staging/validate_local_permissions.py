#!/usr/bin/env python3
"""Local-only, rollback-only FEH permissions review validation.

Run from the reviewed Git worktree on Windows with Docker Desktop available.
No Supabase URLs, credentials, network APIs, or production connections.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
import re
import subprocess
import sys

CONTAINER = "supabase_db_feh-staging-role-fix"
ROOT = Path(__file__).resolve().parents[2]
DRAFT = ROOT / "docs/security/20261028_REVIEW_ONLY_public_privilege_hardening.sql"
TESTS = ROOT / "docs/staging/synthetic_database_tests.sql"
MIGRATIONS = ROOT / "supabase/migrations"
STAGING_MANIFEST = ROOT / "docs/staging/staging_61_manifest.csv"


class ValidationFailure(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationFailure(message)


def remove_one_line(source: str, keyword: str, description: str) -> str:
    pattern = rf"(?im)^[ \t]*{re.escape(keyword)};[ \t]*$"
    require(len(re.findall(pattern, source)) == 1, f"Expected exactly one {description}")
    return re.sub(pattern, "", source, count=1)


def build_rollback_test() -> str:
    draft = DRAFT.read_text(encoding="utf-8")
    tests = TESTS.read_text(encoding="utf-8")
    require("REVIEW ONLY" in draft and "NOT AN APPROVED" in draft,
            "Draft SQL review-only notice missing")
    require("T01 unsafe TRUNCATE grants" in tests,
            "Privilege regression check missing")
    require("FEH synthetic runner: postgres session required" in tests,
            "Scoped runner guard missing")
    numbers = [int(x) for x in re.findall(r"(?m)^[ \t]*--[ \t]*(0[1-9]|1[0-9]|20):", tests)]
    require(numbers == list(range(1, 21)), "Expected exactly T01–T20 in order")
    require("grant external_lead_ingestor to postgres with inherit false, set true;" in tests,
            "Temporary ingestor role grant changed")
    require("grant execution_dispatch_worker to postgres with inherit false, set true;" in tests,
            "Temporary dispatch role grant changed")
    require("do $feh_membership_cleanup$" in tests,
            "Post-rollback membership check missing")
    require("select 'passed'::text as synthetic_tests, 20 as assertions;" in tests,
            "20-assertion success marker missing")

    draft = remove_one_line(draft, "begin", "draft BEGIN")
    draft = remove_one_line(draft, "commit", "draft COMMIT")
    tests = remove_one_line(tests, "begin", "test BEGIN")
    sections = re.split(r"(?im)^[ \t]*rollback;[ \t]*\r?\n", tests)
    require(len(sections) == 2, "Expected exactly one test ROLLBACK")
    before, after = sections
    require("do $feh_membership_cleanup$" in after,
            "Missing cleanup verification after the rollback")
    require("select 'passed'::text as synthetic_tests, 20 as assertions;" in after,
            "Missing success marker after rollback")
    require(not re.search(r"(?im)^[ \t]*(?:begin|commit|rollback);[ \t]*$", draft + before + after),
            "Unexpected transaction-control statement")

    # All proposed DDL, role membership, and synthetic fixtures share ONE tx.
    # Only the post-rollback membership audit and PASS marker run afterwards.
    return "BEGIN;\n" + draft + "\n" + before + "\nROLLBACK;\n" + after


def command(args: list[str], *, input_text: str | None = None,
            timeout: int = 90) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(args, input=input_text, capture_output=True,
                              text=True, encoding="utf-8", errors="replace",
                              timeout=timeout, check=False)
    except FileNotFoundError as exc:
        raise ValidationFailure(f"Missing executable: {args[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise ValidationFailure("Local command timed out; verify rollback") from exc


def docker_psql(sql: str, *, timeout: int = 45) -> str:
    call = command(["docker", "exec", "-i", CONTAINER,
                    "psql", "-X", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A",
                    "-U", "postgres", "-d", "postgres"],
                   input_text=sql, timeout=timeout)
    if call.returncode != 0:
        raise ValidationFailure(f"Local psql failed (exit {call.returncode}):\n"
                                + (call.stdout + call.stderr)[-3500:])
    return call.stdout.strip()


def check_docker_target() -> None:
    context = command(["docker", "context", "show"], timeout=15)
    require(context.returncode == 0, "Docker Desktop is unavailable")
    require(context.stdout.strip() in ("default", "desktop-linux"),
            "Docker context is not the expected local Desktop context")
    host = os.environ.get("DOCKER_HOST", "")
    require(not host or host.startswith("npipe:") or host.startswith("unix:"),
            "Remote DOCKER_HOST is not allowed")
    info = command(["docker", "inspect", "--format", "{{.Name}}|{{.State.Running}}",
                    CONTAINER], timeout=15)
    require(info.returncode == 0 and info.stdout.strip() == "/" + CONTAINER + "|true",
            f"Expected running dedicated local container {CONTAINER}")


def baseline() -> dict[str, object]:
    sql = """select json_build_object(
      'database', current_database(), 'user', session_user,
      'superuser', current_setting('is_superuser'),
      'postgres_version', current_setting('server_version_num')::int,
      'public_tables', (select count(*) from pg_class c join pg_namespace n
        on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
      'rls_tables', (select count(*) from pg_class c join pg_namespace n
        on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')
          and c.relrowsecurity),
      'migrations', (select count(*) from supabase_migrations.schema_migrations),
      'leads', (select count(*) from public.leads),
      'tasks', (select count(*) from public.tasks),
      'activities', (select count(*) from public.activities),
      'audit_log', (select count(*) from public.audit_log),
      'user_roles', (select count(*) from public.user_roles),
      'auth_users', (select count(*) from auth.users),
      'customers', (select count(*) from public.customers),
      'customer_sites', (select count(*) from public.customer_sites)
    )::text;"""
    try:
        result = json.loads(docker_psql(sql))
    except ValueError as exc:
        raise ValidationFailure("Cannot parse local baseline metadata") from exc
    return result


def exact_migration_history(profile: str) -> list[tuple[str, str]]:
    """Read expected versions from reviewed files, never from the database."""
    if profile == "approved-staging-61":
        with STAGING_MANIFEST.open(newline="", encoding="utf-8") as stream:
            rows = list(csv.DictReader(stream))
        require(len(rows) == 61, "The 61-row reviewed manifest has changed")
        history = [(str(row["production_version"]), str(row["name"])) for row in rows]
        require(history == sorted(history), "Reviewed staging manifest is not ordered")
    elif profile == "local-source-63":
        files = sorted(MIGRATIONS.glob("*.sql"))
        require(len(files) == 63, "Expected exactly 63 pinned source SQL files")
        history = []
        for file in files:
            parts = file.stem.split("_", 1)
            require(len(parts) == 2 and re.fullmatch(r"\d{14}", parts[0]) is not None,
                    "Unexpected migration filename: " + file.name)
            history.append((parts[0], parts[1]))
        required = {
            ("20260826100000", "authoritative_prepared_envelope_checkpoint"),
            ("20260828120000", "prepared_dispatch_destination_binding"),
            ("20260831120000", "health_check_crm_persistence"),
        }
        require(required.issubset(set(history)),
                "Source-63 baseline is missing reviewed local-only migration versions")
        require(not any(version == "20260901124827" for version, _ in history),
                "Source-63 baseline unexpectedly includes production Health Check alias")
    else:
        raise ValidationFailure("Unexpected migration profile")

    require(len(history) == len(set(history)), "Duplicate migration version/name")
    require(len({version for version, _ in history}) == len(history),
            "Duplicate migration version")
    return history


def actual_migration_history() -> list[tuple[str, str]]:
    sql = """select coalesce(json_agg(json_build_array(version::text,name::text)
      order by version), '[]'::json)::text
      from supabase_migrations.schema_migrations;"""
    try:
        rows = json.loads(docker_psql(sql))
        return [(str(row[0]), str(row[1])) for row in rows]
    except (ValueError, IndexError, TypeError) as exc:
        raise ValidationFailure("Cannot parse local migration history") from exc


def fingerprint() -> str:
    sql = """with state as (
      select 'table:'||c.oid::text as k,
        coalesce(c.relacl::text,'<null>')||':'||c.relrowsecurity::text as v
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p')
      union all
      select 'defaults:'||d.defaclrole::text||':'||d.defaclnamespace::text||
        ':'||d.defaclobjtype as k,coalesce(d.defaclacl::text,'<null>') as v
      from pg_default_acl d where d.defaclnamespace='public'::regnamespace
      union all
      select 'membership:'||m.roleid::text||':'||m.member::text||':'||m.grantor::text,
        m.admin_option::text||':'||m.inherit_option::text||':'||m.set_option::text
      from pg_auth_members m
      where m.roleid in ('external_lead_ingestor'::regrole,
                         'execution_dispatch_worker'::regrole)
    ) select md5(coalesce(string_agg(k||'='||v,E'\\n' order by k),'')) from state;"""
    result = docker_psql(sql)
    require(re.fullmatch(r"[a-f0-9]{32}", result) is not None,
            "Invalid privilege fingerprint")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--static-only", action="store_true",
                        help="Validate file layout only (no Docker connection)")
    parser.add_argument("--profile", choices=("approved-staging-61", "local-source-63"),
                        default="approved-staging-61",
                        help="Exact reviewed migration history; source-63 is LOCAL DIAGNOSTIC ONLY")
    args = parser.parse_args()
    sql = build_rollback_test()
    print("PASS: T01–T20 labels, rollback-only test assembly and guards")
    if args.static_only:
        return 0

    check_docker_target()
    before = baseline()
    require(before['database'] == 'postgres' and before['user'] == 'postgres',
            "Unexpected database identity")
    require(before['superuser'] == 'off' and 170000 <= before['postgres_version'] < 180000,
            "Expected non-superuser postgres on PostgreSQL 17")
    require(before['public_tables'] == 26 and before['rls_tables'] == 26,
            "Expected 26 RLS-enabled public tables")
    expected = exact_migration_history(args.profile)
    actual = actual_migration_history()
    require(before['migrations'] == len(expected), 
            f"Expected {len(expected)} migrations for {args.profile}, "
            f"found {before['migrations']}")
    require(actual == expected,
            f"Local migration history differs from exact {args.profile} allowlist; "
            f"extra={sorted(set(actual)-set(expected))[:5]}, "
            f"missing={sorted(set(expected)-set(actual))[:5]}")
    names = ('leads', 'tasks', 'activities', 'audit_log', 'user_roles',
             'auth_users', 'customers', 'customer_sites')
    require(all(before[name] == 0 for name in names),
            "Local test database has nonempty business or Auth tables; REFUSE test")
    old_grants = fingerprint()
    print(f"PASS: dedicated Docker database, exact {len(expected)} migrations "
          "and empty RLS baseline")
    if args.profile == "local-source-63":
        print("NOTE: This 63-migration development database is NOT equivalent "
              "to approved cloud staging's 61 migrations. Results are only "
              "a local diagnostic, never staging approval.")

    print("Running rollback-only local SQL checks ...")
    issue = None
    try:
        result = docker_psql(sql, timeout=150)
        require('passed|20' in result.splitlines(),
                "T01–T20 success marker absent")
    except ValidationFailure as exc:
        issue = str(exc)

    # Post-state checked even if the SQL fails. ON_ERROR_STOP ensures an
    # aborted psql session closes, rolling back its uncommitted transaction.
    after = baseline()
    new_grants = fingerprint()
    require(after == before and old_grants == new_grants,
            "FAIL: local data counts or privileges differ from the baseline")
    print("PASS: local table counts, role membership and ACLs match pre-test state")
    if issue:
        raise ValidationFailure("Synthetic SQL did not pass; rollback verified.\n" + issue)
    print("PASS: all 20 synthetic assertions reported success after rollback")
    print("NOTE: PostgreSQL identity sequences may advance despite ROLLBACK.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ValidationFailure as exc:
        print("STOP: " + str(exc), file=sys.stderr)
        sys.exit(1)
