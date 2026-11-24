#!/bin/sh
set -eu
umask 077
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
deps=$(realpath "$1")
pkg=$(realpath "$2")/usr
source=$(realpath "${3:-$here/..}")
pg="$pkg/lib/postgresql/17/bin"
work=$(mktemp -d /tmp/feh133-combined-native.XXXXXXXX)
cleanup() {
  rm -rf -- "$work"
}
trap cleanup EXIT
mkdir "$work/review" "$work/patched"
python3 "$here/prepare.py" "$work/review" "$source"
archive="$work/review/website-enquiry-intake"
readback="$work/review/website-enquiry-readback"
testdir="$work/review/website-health-check-integration"
node=$(command -v node)
cd "$work/patched"
cp "$archive/airo/attempt/native/quote-held.ts" "$archive/airo/attempt/native/enquiries-schema.ts" "$archive/airo/attempt/native/enquiry-store.candidate.ts" .
cp "$archive/airo/shared-route/native-purpose.mjs" .
git apply "$archive/airo/shared-route/candidate.patch"
git apply "$archive/airo/shared-route/business-answer-store.patch"
git apply "$readback/row-fidelity.patch"
git apply "$readback/health-check-reference.patch"
cd "$work"
python3 "$here/guard.py" "$node" "$testdir/build.cjs" "$deps"
python3 "$here/guard.py" "$pg/initdb" -D "$work/data" -L "$pkg/share/postgresql/17" -U postgres --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8 > init.log
python3 "$here/guard.py" "$node" --no-warnings "$testdir/integration.mjs" "$deps" "$here/guard.py" "$pg/postgres" "$work/data" "$pkg/lib/postgresql/17"
