import assert from 'node:assert/strict';
import { lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute } from 'node:path';

export function privateTestSocket(path) {
  assert(typeof path === 'string' && isAbsolute(path) && basename(path) === 'test.sock');
  const directory = dirname(path);
  assert(/^feh133-native-[A-Za-z0-9]+$/.test(basename(directory)), 'requires a run-owned test directory');
  assert.equal(realpathSync(path), path, 'test socket may not be a symlink');
  const parent = lstatSync(directory);
  const socket = lstatSync(path);
  assert(parent.isDirectory() && parent.uid === process.getuid() && (parent.mode & 0o077) === 0);
  assert(socket.isSocket() && socket.uid === process.getuid(), 'requires an owned Unix socket');
  return path;
}
