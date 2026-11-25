"""Read the committed synthetic rows over a run-owned Unix socket under two fixture roles."""
import http.client
import json
import pathlib
import socket
import subprocess
import sys
import time
from urllib.parse import urlencode

binary, directory, *ids = sys.argv[1:]
directory = pathlib.Path(directory)
assert directory.parent == pathlib.Path('/tmp') and directory.name.startswith('feh133-native-')
assert len(ids) == 3 and all(value.isdecimal() for value in ids)


class LocalHTTP(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.settimeout(3)
        self.sock.connect(str(directory / 'rest.sock'))


def read(query):
    connection = LocalHTTP('localhost')
    try:
        connection.request('GET', '/leads?' + urlencode(query))
        response = connection.getresponse()
        return response.status, json.loads(response.read())
    finally:
        connection.close()


def verify(role):
    config = {
        'PGRST_DB_URI': 'postgresql://postgres@/postgres?host=' + str(directory),
        'PGRST_DB_ANON_ROLE': role,
        'PGRST_DB_CONFIG': 'false',
        'PGRST_DB_CHANNEL_ENABLED': 'false',
        'PGRST_SERVER_UNIX_SOCKET': str(directory / 'rest.sock'),
        'PGRST_SERVER_UNIX_SOCKET_MODE': '600',
    }
    with subprocess.Popen([binary], cwd=directory, env=config) as server:
        try:
            projection = 'route_id:id::text,company_name'
            query = {'select': projection, 'id': 'in.(' + ','.join(ids) + ')', 'order': 'id.asc'}
            deadline = time.monotonic() + 10
            while True:
                assert server.poll() is None, 'Disposable PostgREST exited'
                try:
                    status, rows = read(query)
                    if status != 503:
                        break
                except (FileNotFoundError, ConnectionRefusedError):
                    pass
                assert time.monotonic() < deadline, 'Disposable PostgREST failed to become ready'
                time.sleep(.1)
            expected = [{'route_id': value, 'company_name': 'REST fixture ' + value} for value in ids]
            assert status == 200 and rows == (expected if role == 'authenticated' else []), (status, rows)
            for value in ids + ['9223372036854775806']:
                status, rows = read({'select': projection, 'id': 'eq.' + value})
                assert status == 200 and rows == [row for row in expected if role == 'authenticated'
                                                   and row['route_id'] == value]
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()
    (directory / 'rest.sock').unlink(missing_ok=True)


for fixture_role in ('authenticated', 'anon'):
    verify(fixture_role)
print('PostgREST 13.0.8 verified exact bigint projection, detail filters and CRM role visibility on Unix sockets')
