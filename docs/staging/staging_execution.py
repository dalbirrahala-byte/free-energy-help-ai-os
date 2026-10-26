#!/usr/bin/env python3
"""One approved staging target. CLI owns migration execution and version history."""
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

TARGET = "vredwhyphrhsudggrsen"
PROJECT_NAME = "free-energy-help-crm-staging"
REPOSITORY = "dalbirrahala-byte/free-energy-help-ai-os"
BRANCH = "refs/heads/ops/staging-61-execution-20261026"
SOURCE = "92e1044a9d2426d7910c0e50cc39865a7b2a6097"
MANIFEST_HASH = "a4ff46c03b6d2d617c429deba27a4b1728f703054d17c1068b5d6aa39f1c5bd6"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def scope_guard(env):
    require(env.get("GITHUB_ACTIONS") == "true", "GitHub Actions only")
    require(env.get("GITHUB_EVENT_NAME") == "workflow_dispatch", "Manual dispatch only")
    require(env.get("GITHUB_REPOSITORY") == REPOSITORY, "Wrong repository")
    require(env.get("GITHUB_REF") == BRANCH, "Wrong branch")


def workdir():
    require(bool(os.environ.get("RUNNER_TEMP")), "RUNNER_TEMP missing")
    return Path(os.environ["RUNNER_TEMP"]) / "feh-approved-staging-61"


def evidence_path():
    return Path(os.environ["RUNNER_TEMP"]) / "feh-staging-evidence.json"


def clean(text):
    for key in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"):
        value = os.environ.get(key)
        if value:
            text = text.replace(value, "[REDACTED]")
    return re.sub(r"postgres(?:ql)?://[^\s]+", "[REDACTED_DATABASE_URL]", text)


def run(args):
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=1200)
    # Only reviewed SQL/CLI output; never debug logs or secret-bearing command lines.
    print(clean(result.stdout + result.stderr), end="")
    require(result.returncode == 0, "Command failed (exit %s); stop, do not reset or repair" % result.returncode)
    return result.stdout.strip()


def validate_files(directory):
    manifest = directory / "sha256_manifest.json"
    require(hashlib.sha256(manifest.read_bytes()).hexdigest() == MANIFEST_HASH,
            "Reviewed manifest checksum mismatch")
    rows = json.loads(manifest.read_text())
    expected_files = {r["file"] for r in rows}
    actual_files = {str(p.relative_to(directory)) for p in (directory / "supabase/migrations").glob("*.sql")}
    require(len(rows) == 61 and actual_files == expected_files, "Expected exactly the 61 approved SQL files")
    for row in rows:
        require(hashlib.sha256((directory / row["file"]).read_bytes()).hexdigest() == row["sha256"],
                "Migration checksum mismatch: " + row["file"])
    with (HERE / "staging_61_manifest.csv").open() as source:
        allowlist = list(csv.DictReader(source))
    require([Path(r["file"]).name for r in rows] == [r["staging_filename"] for r in allowlist],
            "Reviewed CSV order mismatch")
    return [{"version": r["production_version"], "name": r["name"]} for r in allowlist]


def prepare():
    scope_guard(os.environ)
    source = Path(os.environ["RUNNER_TEMP"]) / "feh-reviewed-source"
    run(["git", "worktree", "add", "--detach", str(source), SOURCE])
    run(["python", str(HERE / "prepare_staging_migrations.py"), str(source), str(workdir())])
    validate_files(workdir())
    print("Prepared exactly 61 reviewed versions; database not contacted.")


def api(path, body=None):
    # Fixed Supabase origin and fixed staging project; no arbitrary URLs or redirects.
    require(path == "" or path == "/database/query", "API path not allowlisted")
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    require(bool(token), "FEH_STAGING_ACCESS_TOKEN missing")
    request = urllib.request.Request(
        "https://api.supabase.com/v1/projects/" + TARGET + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="GET" if body is None else "POST",
    )
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # SQL can contain synthetic values only. Keep diagnostics bounded and redacted.
        detail = clean(error.read().decode(errors="replace"))[:2000]
        raise RuntimeError(f"Staging API HTTP {error.code}: {detail}") from None
    # No automatic retries, including on ambiguous query outcomes.


def query(sql, read_only=True):
    result = api("/database/query", {"query": sql, "read_only": read_only})
    require(isinstance(result, list), "Unexpected SQL response; no assumption of success")
    return result


def verify_project(project):
    require(project.get("id") == TARGET and project.get("name") == PROJECT_NAME,
            "Project fingerprint mismatch")
    require(project.get("status") == "ACTIVE_HEALTHY", "Staging project not healthy")
    require(project.get("database", {}).get("host") == f"db.{TARGET}.supabase.co",
            "Staging database host mismatch")


def history():
    exists = query("select to_regclass('supabase_migrations.schema_migrations')::text as relation")
    if exists == [{"relation": None}]:
        return []
    require(len(exists) == 1 and exists[0].get("relation"), "Cannot establish migration history")
    return query("select version, name from supabase_migrations.schema_migrations order by version")


def classify_history(actual, expected):
    if not actual:
        return "empty"
    require(actual == expected, "Partial or unexpected history: STOP; no reset, repair or automatic resume")
    return "complete"


def snapshot():
    return query("""select
      (select count(*)::int from pg_tables where schemaname='public') as public_tables,
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from storage.objects) as storage_objects,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public') as public_functions""")[0]


def empty_business_data():
    counts = query("""select
      (select count(*)::int from public.leads) as leads,
      (select count(*)::int from public.customers) as customers,
      (select count(*)::int from public.tasks) as tasks,
      (select count(*)::int from public.activities) as activities,
      (select count(*)::int from public.audit_log) as audit_log,
      (select count(*)::int from public.execution_authorizations) as authorizations,
      (select count(*)::int from public.execution_dispatch_attempts) as attempts,
      (select count(*)::int from public.execution_provider_adapters) as adapters,
      (select count(*)::int from auth.users) as auth_users""")[0]
    expected = {"leads", "customers", "tasks", "activities", "audit_log", "authorizations", "attempts", "adapters", "auth_users"}
    require(set(counts) == expected and all(v == 0 for v in counts.values()),
            "Nonempty or unverified staging business data; STOP without reading records")
    return counts


def execute():
    scope_guard(os.environ)
    require(bool(os.environ.get("SUPABASE_DB_PASSWORD")), "FEH_STAGING_DB_PASSWORD missing")
    expected = validate_files(workdir())
    cli = str(HERE / "execution-tools/node_modules/.bin/supabase")
    evidence = {"project": TARGET, "commit": os.environ.get("GITHUB_SHA"),
                "status": "preflight", "installation_attempted": False,
                "installed_this_run": [], "synthetic_tests": "not executed"}
    def save():
        evidence_path().write_text(json.dumps(evidence, indent=2) + "\n")
    save()
    try:
        verify_project(api(""))
        before = history()
        state = classify_history(before, expected)
        evidence["history_before"] = before
        evidence["snapshot_before"] = snapshot()
        require(evidence["snapshot_before"]["auth_users"] == 0, "Staging contains Auth users")
        require(evidence["snapshot_before"]["storage_objects"] == 0, "Staging contains Storage objects")
        if state == "empty":
            require(evidence["snapshot_before"]["public_tables"] == 0 and
                    evidence["snapshot_before"]["public_functions"] == 0,
                    "Untracked staging schema; STOP")
            command = [cli, "db", "push", "--project-ref", TARGET, "--workdir", str(workdir()), "--skip-vault"]
            # No seed, roles.sql, extra migrations, config push, reset or history repair.
            run(command + ["--dry-run"])
            verify_project(api(""))
            require(history() == before and snapshot() == evidence["snapshot_before"], "Preflight drift")
            evidence["status"] = "installing"
            evidence["installation_attempted"] = True
            save()
            run(command + ["--yes"])
        else:
            print("Exact reviewed baseline already installed: migration application skipped.")
        after = history()
        require(after == expected, "Post-install history is not the exact 61 reviewed versions")
        evidence["history_after"] = after
        evidence["installed_this_run"] = [r for r in after if r not in before]
        evidence["data_before_tests"] = empty_business_data()
        evidence["status"] = "testing"
        evidence["synthetic_tests"] = "attempt started; result and rollback not yet confirmed"
        save()
        result = query((HERE / "synthetic_database_tests.sql").read_text(), read_only=False)
        require(result == [{"synthetic_tests": "passed", "assertions": 20}], "Synthetic test result not confirmed")
        evidence["synthetic_tests"] = "20 assertions returned passed; cleanup verification pending"
        evidence["data_after_tests"] = empty_business_data()
        require(history() == expected, "History changed during tests")
        evidence["synthetic_tests"] = "20 assertions passed; fixture transaction rolled back"
        evidence["status"] = "passed"
        save()
    except Exception as error:
        evidence["status"] = "blocked_or_failed"
        evidence["error"] = clean(str(error))
        try:
            after = history()  # Read-only observation, never a retry of the failed write.
            evidence["history_after"] = after
            if evidence["installation_attempted"]:
                evidence["installed_this_run"] = [r for r in after if r not in evidence["history_before"]]
        except Exception:
            evidence["history_after"] = "unverified"
        save()
        raise


def summary():
    path = evidence_path()
    evidence = json.loads(path.read_text()) if path.exists() else {
        "status": "execution not started", "installed_this_run": [], "synthetic_tests": "not executed"}
    output = "## Staging execution evidence\n\n```json\n" + json.dumps(evidence, indent=2) + "\n```\n"
    print(output)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(output)


if __name__ == "__main__":
    try:
        require(len(sys.argv) == 2 and sys.argv[1] in ("prepare", "execute", "summary"), "Invalid mode")
        {"prepare": prepare, "execute": execute, "summary": summary}[sys.argv[1]]()
    except Exception as error:
        print("STOP: " + clean(str(error)), file=sys.stderr)
        sys.exit(1)
