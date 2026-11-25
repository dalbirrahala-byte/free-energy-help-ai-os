#!/bin/sh
# Use the archived synthetic fixtures and a local copy of the pinned bundle.
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive=$(realpath "$1")
asset=$(realpath "$2")
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
cp "$archive/airo/attempt/native/quote-held.ts" "$archive/airo/attempt/native/enquiry-store.candidate.ts" "$work/"
cd "$work"
test "$(git hash-object "$archive/tests/deny-network.py")" = 3e8f7c946cda0da555852bfddf68c26f1c138c1f
test "$(git hash-object quote-held.ts)" = 31c0dc1b237c2e911d5000540d44a7a6530b5278
test "$(git hash-object enquiry-store.candidate.ts)" = 661d01e7b9c75e80b7e791d14817845cdb30a054
test "$(git hash-object "$here/candidate.patch")" = 15a944a4e594d2cb4aab59c1b29f2f2ee6c91e30
git apply "$here/candidate.patch"
python3 "$archive/tests/deny-network.py" "$(command -v node)" --no-warnings "$here/business-quote-attempt.test.mjs" "$asset" "$work/quote-held.ts"
