#!/bin/sh
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive="$here/../website-enquiry-intake"
deps=$(realpath "$1")
node=$(command -v node)
guard="$archive/tests/deny-network.py"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
cd "$work"
mkdir -p src/server/api/quote
cp "$archive/airo/quote-POST.ts" src/server/api/quote/POST.ts
python3 "$guard" /usr/bin/python3 "$here/backend-patch.py" > backend.patch
echo '857c28a761662df11c31fe37eeb52b8c8a46bebd31cc9e2aa6b4c0f85652555e  backend.patch' | sha256sum -c -
python3 "$guard" /usr/bin/git apply --no-index backend.patch
python3 "$guard" "$node" --no-warnings "$here/dedicated-receipt.test.mjs" "$deps"
