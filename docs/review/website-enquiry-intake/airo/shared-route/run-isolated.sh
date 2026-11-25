#!/bin/sh
# Run from a checkout of this engineering candidate, with Node 24 and Linux libseccomp.
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
src="$here/../attempt/native"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
for file in quote-held.ts enquiry-store.candidate.ts; do
  cp "$src/$file" "$tmp/$file"
done
cp "$here/shared-route.test.mjs" "$tmp/"
cd "$tmp"
test "$(git hash-object quote-held.ts)" = 31c0dc1b237c2e911d5000540d44a7a6530b5278
test "$(git hash-object enquiry-store.candidate.ts)" = 661d01e7b9c75e80b7e791d14817845cdb30a054
git apply "$here/candidate.patch"
python3 "$here/../../tests/deny-network.py" "$(command -v node)" --no-warnings "$tmp/shared-route.test.mjs"
