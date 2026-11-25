#!/bin/sh
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive="$here/../website-enquiry-intake"
node_bin=$(command -v node)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
cd "$work"
mkdir -p src/server/api/quote src/server/lib src/server/db
cp "$archive/airo/quote-POST.ts" src/server/api/quote/POST.ts
for f in src/server/lib/enquiry-store.ts src/server/db/schema.ts; do
  echo '// Existing Airo module stand-in' > "$f"
done
sha256sum src/server/api/quote/POST.ts src/server/lib/enquiry-store.ts src/server/db/schema.ts > before.sha256
python3 "$here/backend-patch.py" > backend.patch
git apply --no-index --check backend.patch
git apply --no-index backend.patch
sha256sum --check before.sha256
if git apply --no-index --check backend.patch 2>/dev/null; then exit 1; fi
python3 "$archive/tests/deny-network.py" "$node_bin" --no-warnings "$here/separate-backend.test.mjs"
git apply --no-index --reverse backend.patch
sha256sum --check before.sha256
test "$(find src -type f | wc -l)" -eq 3
