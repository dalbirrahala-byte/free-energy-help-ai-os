#!/bin/sh
# Run with the reviewed source archive and unpacked, provenance-verified MySQL distribution.
set -eu
umask 077
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
archive=$(realpath "$1")
mysqlroot=$(realpath "$2")
work=$(mktemp -d /tmp/feh133-purpose-XXXXXXXX)
server=
cleanup() {
  if [ -n "$server" ]; then kill "$server" 2>/dev/null || true; wait "$server" 2>/dev/null || true; fi
  rm -rf -- "$work"
}
trap cleanup EXIT
native="$archive/airo/attempt/native"
cp "$native/quote-held.ts" "$native/enquiry-store.candidate.ts" "$here/native-purpose.mjs" "$work/"
cp "$archive/airo/attempt/mysql-attempt-store.ts" "$work/"
cd "$work"
test "$(git hash-object mysql-attempt-store.ts)" = b403c2fa7e9c61dd65d39f96022e4bed540698c5
test "$(git hash-object quote-held.ts)" = 31c0dc1b237c2e911d5000540d44a7a6530b5278
test "$(git hash-object enquiry-store.candidate.ts)" = 661d01e7b9c75e80b7e791d14817845cdb30a054
test "$(git hash-object "$native/full-enquiries.fixture.sql")" = 52e47b7807a7cb7c85e38afc0f218f8c7102c175
patchfile="$archive/airo/shared-route/candidate.patch"
test "$(git hash-object "$patchfile")" = 15a944a4e594d2cb4aab59c1b29f2f2ee6c91e30
git apply "$patchfile"
guard="$archive/tests/deny-network.py"
test "$(git hash-object "$guard")" = 3e8f7c946cda0da555852bfddf68c26f1c138c1f
mkfifo input
timeout 70s python3 "$guard" /usr/bin/env LD_LIBRARY_PATH="$mysqlroot/lib/x86_64-linux-gnu" "$mysqlroot/sbin/mysqld" --no-defaults --initialize-insecure --skip-networking --mysqlx=0 --innodb-use-native-aio=0 --basedir="$mysqlroot" --datadir="$work/data" --lc-messages-dir="$mysqlroot/share/mysql-8.4" --secure-file-priv="$work" --init-file=/dev/stdin <input >mysql.log 2>&1 &
server=$!
timeout 60s python3 "$guard" "$(command -v node)" --no-warnings "$work/native-purpose.mjs" "$work" "$native/full-enquiries.fixture.sql"
wait "$server"
server=
if grep -Fq '[ERROR]' mysql.log; then exit 1; fi
