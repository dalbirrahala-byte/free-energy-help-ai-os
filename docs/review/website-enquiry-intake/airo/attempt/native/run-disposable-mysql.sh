#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
node_bin=$(command -v node)
export PATH=/usr/bin:/bin
cache=$(mktemp -d /tmp/feh133-deps-XXXXXXXX)
run_dir=
server_pid=
cleanup_case() {
  if [[ -n "$server_pid" ]]; then
    kill -TERM "$server_pid" 2>/dev/null || true
    for i in {1..80}; do
      if ! kill -0 "$server_pid" 2>/dev/null; then break; fi
      sleep 0.1
    done
    if kill -0 "$server_pid" 2>/dev/null; then
      kill -KILL "$server_pid" 2>/dev/null || true
    fi
    wait "$server_pid" 2>/dev/null || true
    server_pid=
  fi
  if [[ -n "$run_dir" ]]; then rm -rf -- "$run_dir"; run_dir=; fi
}
cleanup() {
  cleanup_case
  rm -rf -- "$cache"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Dependencies are fetched and checked before starting any fixture process.
python3 - "$cache" <<'PY'
import hashlib,json,pathlib,subprocess,sys
cache=pathlib.Path(sys.argv[1])
manifest=json.loads(pathlib.Path('provenance.json').read_text())
for artifact in ('mysql','libaio'):
    metadata=manifest[artifact]
    path=cache/(artifact+'.deb')
    subprocess.run(['/usr/bin/curl','--proto','=https','--max-time','60','--fail','--silent','--show-error',
                    '--output',str(path),metadata['url']],check=True)
    assert hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==metadata['sha256']
    subprocess.run(['/usr/bin/dpkg-deb','-x',str(path),str(cache/'root')],check=True)
PY
cp -- package.json package-lock.json "$cache/"
# The setup-node directory is needed for npm's shebang.
npm_bin="$(dirname "$node_bin")/npm"
env -i PATH="$(dirname "$node_bin"):/usr/bin:/bin" npm_config_cache="$cache/npm-cache" \
  "$npm_bin" --prefix "$cache" ci --registry=https://registry.npmjs.org/ --ignore-scripts --no-audit --no-fund

lib="$cache/root/usr/lib/x86_64-linux-gnu"
mysql="$cache/root/usr/sbin/mysqld"
for fixture in mysql.test.mjs committed-store.test.mjs full-schema-committed-store.test.mjs quote-duplicate.test.mjs; do
  run_dir=$(mktemp -d /tmp/feh133-native-XXXXXXXX)
  opts=(--no-defaults "--basedir=$cache/root/usr" "--datadir=$run_dir/data"
    "--lc-messages-dir=$cache/root/usr/share/mysql-8.4" "--socket=$run_dir/test.sock"
    --skip-networking --mysqlx=0 --secure-file-priv=NULL --innodb-use-native-aio=0)
  timeout 60s python3 unix-only.py "$lib" "$mysql" "${opts[@]}" --initialize-insecure
  python3 unix-only.py "$lib" "$mysql" "${opts[@]}" \
    "--pid-file=$run_dir/mysql.pid" "--log-error=$run_dir/mysql.log" &
  server_pid=$!
  for i in {1..200}; do
    if [[ -S "$run_dir/test.sock" ]] && grep -Fq 'ready for connections' "$run_dir/mysql.log"; then break; fi
    if ! kill -0 "$server_pid" 2>/dev/null; then break; fi
    sleep 0.1
  done
  if [[ ! -S "$run_dir/test.sock" ]] || ! grep -Fq 'ready for connections' "$run_dir/mysql.log"; then
    if [[ -f "$run_dir/mysql.log" ]]; then cat -- "$run_dir/mysql.log"; fi
    exit 1
  fi
  echo "Running $fixture"
  timeout 60s python3 unix-only.py "$lib" "$node_bin" --no-warnings \
    "$fixture" "$cache/node_modules/mysql2/promise.js" "$run_dir/test.sock"
  cleanup_case
done
