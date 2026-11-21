#!/bin/sh
# Print a review patch only after forward and reverse checks in a private copy.
set -eu
archive=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
original=$archive/../quote-POST.ts
candidate=$archive/native/quote-held.ts
export LC_ALL=C
umask 077
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
ref=src/server/api/quote/POST.ts
cd "$work"
mkdir -p "$(dirname "$ref")"
cp "$original" "$ref"
printf '%s  %s\n' 25219749b68dd6c3b4efd8d79a70ca9377e6e14a68b23f1e3dcd02f1c4680893 "$ref" | sha256sum --check --status
status=0
diff -u --label "a/$ref" --label "b/$ref" "$ref" "$candidate" > quote.patch || status=$?
test "$status" -eq 1
git apply --check quote.patch
git apply quote.patch
cmp "$ref" "$candidate"
git apply --reverse quote.patch
cmp "$ref" "$original"
cat quote.patch
