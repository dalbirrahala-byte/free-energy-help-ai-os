"""Print an add-only patch for a disposable Airo checkout."""
import difflib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

review = Path(__file__).resolve().parent.parent
archive = review / "website-enquiry-intake"
guards = review / "website-enquiry-readback"
native = archive / "airo/attempt/native"
shared = archive / "airo/shared-route"


def replace_import(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f"Review changed import {old}")
    return source.replace(old, new)


def backend_files():
    with tempfile.TemporaryDirectory() as folder:
        work = Path(folder)
        for name in ("quote-held.ts", "enquiry-store.candidate.ts", "enquiries-schema.ts"):
            shutil.copyfile(native / name, work / name)
        shutil.copyfile(shared / "native-purpose.mjs", work / "native-purpose.mjs")
        for patch in (shared / "candidate.patch", shared / "business-answer-store.patch",
                      guards / "row-fidelity.patch", guards / "health-check-reference.patch",
                      Path(__file__).resolve().with_name("duplicate-details.patch")):
            subprocess.run(["git", "apply", "--no-index", str(patch)], cwd=work, check=True)

        handler = replace_import((work / "quote-held.ts").read_text(),
                                 "@/server/lib/enquiry-store.js", "@/server/lib/health-check-store.js")
        handler = replace_import(handler, "@/server/lib/quote-crm-step.js",
                                 "@/server/lib/health-check-intake/airo/attempt/handoff.js")
        store = replace_import((work / "enquiry-store.candidate.ts").read_text(),
                               "../db/schema.js", "./health-check-table.js")
        store = replace_import(store, "import type { CrmPayload } from './crm-client.js'",
                               "import type { Payload as CrmPayload } from './health-check-intake/source/contract.js'")
        files = {
            "src/server/api/health-check/POST.ts": handler,
            "src/server/lib/health-check-store.ts": store,
            "src/server/lib/health-check-table.ts": (work / "enquiries-schema.ts").read_text(),
        }
        for name in ("airo/attempt/handoff.ts", "source/client.ts", "source/contract.ts", "source/receiver.ts"):
            # The archived Node sources use .ts specifiers. Airo uses emitted .js paths.
            source = (archive / name).read_text()
            files["src/server/lib/health-check-intake/" + name] = source.replace(".ts';", ".js';")
        return files


if __name__ == "__main__":
    for name, code in backend_files().items():
        print(f"diff --git a/{name} b/{name}\nnew file mode 100644")
        sys.stdout.writelines(difflib.unified_diff([], code.splitlines(keepends=True),
                                                   fromfile="/dev/null", tofile="b/" + name))
