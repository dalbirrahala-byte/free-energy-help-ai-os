"""Verify the contents of a clean website enquiry source export."""
import hashlib
import json
from pathlib import Path


def verify(root):
    manifest = root / "MANIFEST.json"
    if manifest.is_symlink() or not manifest.is_file():
        raise SystemExit("Missing or invalid MANIFEST.json")
    expected = json.loads(manifest.read_text(encoding="utf-8"))["files"]
    seen = set()
    errors = []
    for path in sorted(root.rglob("*")):
        name = path.relative_to(root).as_posix()
        if path.is_symlink():
            errors.append(f"Unexpected symbolic link: {name}")
        elif path == manifest or path.is_dir():
            continue
        elif name not in expected or not path.is_file():
            errors.append(f"Unexpected file: {name}")
        else:
            seen.add(name)
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected[name]:
                errors.append(f"Digest mismatch: {name}")
    errors.extend(f"Missing file: {name}" for name in sorted(expected.keys() - seen))
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Verified SHA-256 for all {len(seen)} archive files.")


if __name__ == "__main__":
    verify(Path(__file__).resolve().parents[1])
