#!/bin/sh
# Pass a local frontend node_modules containing Next, TypeScript and PGlite.
set -eu
deps=$(realpath "${1:?Pass the installed frontend node_modules path}")
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive="$here/../website-enquiry-intake"
guards="$here/../website-enquiry-readback"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir "$work/patched"
cd "$work/patched"
for file in quote-held.ts enquiries-schema.ts enquiry-store.candidate.ts; do
  cp "$archive/airo/attempt/native/$file" .
done
cp "$archive/airo/shared-route/native-purpose.mjs" .
git apply "$archive/airo/shared-route/candidate.patch"
git apply "$archive/airo/shared-route/business-answer-store.patch"
git apply "$guards/row-fidelity.patch"
git apply "$guards/health-check-reference.patch"
cd "$work"
node_bin=$(command -v node)
python3 "$archive/tests/deny-network.py" "$node_bin" "$here/build.cjs" "$deps"
python3 "$archive/tests/deny-network.py" "$node_bin" --no-warnings "$here/integration.mjs" "$deps"
