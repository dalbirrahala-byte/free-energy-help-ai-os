#!/bin/sh
# Use a local copy of the public asset. This fixture never downloads it.
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive=$(realpath "$1")
asset=$(realpath "$2")
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
native="$archive/airo/attempt/native"
guard="$archive/tests/deny-network.py"
patchfile="$archive/airo/shared-route/candidate.patch"
cp "$native/quote-held.ts" "$native/enquiry-store.candidate.ts" "$here/business-quote-body.mjs" "$here/business-quote-body.test.mjs" "$work/"
cd "$work"
test "$(git hash-object "$guard")" = 3e8f7c946cda0da555852bfddf68c26f1c138c1f
test "$(git hash-object quote-held.ts)" = 31c0dc1b237c2e911d5000540d44a7a6530b5278
test "$(git hash-object enquiry-store.candidate.ts)" = 661d01e7b9c75e80b7e791d14817845cdb30a054
test "$(git hash-object "$patchfile")" = 15a944a4e594d2cb4aab59c1b29f2f2ee6c91e30
git apply "$patchfile"
python3 "$guard" "$(command -v node)" --no-warnings "$work/business-quote-body.test.mjs" "$asset"
