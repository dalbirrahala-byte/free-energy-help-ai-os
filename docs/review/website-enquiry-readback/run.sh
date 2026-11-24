#!/bin/sh
# Run from a checkout of the source-review commit. Requires Node 24 and libseccomp.
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive=$(realpath "$here/../website-enquiry-intake")
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
cd "$work"
for file in quote-held.ts enquiry-store.candidate.ts enquiries-schema.ts; do
  cp "$archive/airo/attempt/native/$file" .
done
git apply "$archive/airo/shared-route/candidate.patch"
git apply "$archive/airo/shared-route/business-answer-store.patch"
git apply "$here/row-fidelity.patch"
cp "$here/row-fidelity.test.mjs" .
python3 "$archive/tests/deny-network.py" "$(command -v node)" --no-warnings row-fidelity.test.mjs
