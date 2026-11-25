"""Check the two recorded Airo commits against the reviewed Health Check package."""
import argparse
import re
import runpy
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROUTES = ("src/server/entry.ts", "src/pages/business-energy-health-check.tsx")
SHARED = "src/server/api/quote/POST.ts"


def check(repo, base, draft, node, compiler):
    def git(*args, data=None):
        return subprocess.check_output(["git", "--no-replace-objects", "-C", repo, *args], input=data)

    for revision in (base, draft):
        if not re.fullmatch(r"(?:[a-f0-9]{40}|[a-f0-9]{64})", revision):
            raise ValueError("Supply two full commit object IDs")
        if git("cat-file", "-t", revision).strip() != b"commit":
            raise ValueError("Expected a commit object")

    additions = runpy.run_path(str(HERE / "backend-patch.py"))["backend_files"]()
    changed = set(git("diff-tree", "-r", "--no-commit-id", "--no-renames",
                      "--ignore-submodules=none", "--name-only", "-z", base, draft).split(b"\0")) - {b""}
    if changed != {p.encode() for p in (*ROUTES, *additions)}:
        raise ValueError("Draft differs from the complete proposed change set. Review the delta.")

    def entry(rev, path):
        line = git("ls-tree", "-z", rev, "--", path)
        if not line:
            return None
        info, name = line.rstrip(b"\0").split(b"\t")
        mode, kind, oid = info.split()
        if name != path.encode() or kind != b"blob" or mode not in (b"100644", b"100755"):
            raise ValueError("Expected a regular source file: " + path)
        return mode, oid

    if entry(base, SHARED) is None:
        raise ValueError("Missing shared handler in the base commit")
    for path, code in additions.items():
        expected = git("hash-object", "--stdin", data=code.encode()).strip()
        if entry(base, path) is not None or entry(draft, path) != (b"100644", expected):
            raise ValueError("Dedicated file differs from its proposed addition: " + path)

    with tempfile.TemporaryDirectory() as temp:
        files = []
        for rev in (base, draft):
            for path in ROUTES:
                original, current = entry(base, path), entry(rev, path)
                if not original or not current or original[0] != current[0]:
                    raise ValueError("Expected the original file mode: " + path)
                file = Path(temp) / str(len(files))
                source = git("cat-file", "blob", current[1])
                source.decode("utf-8", errors="strict")
                file.write_bytes(source)
                files.append(file)
        subprocess.run([node, HERE / "verify-applied.mjs", compiler, *files], check=True)
    print("PASS exact Airo draft:", base, "->", draft)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("repo", "base", "draft", "node", "compiler"):
        parser.add_argument(name)
    args = parser.parse_args()
    try:
        check(**vars(args))
    except (ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Draft verification failed: {error}\n")
