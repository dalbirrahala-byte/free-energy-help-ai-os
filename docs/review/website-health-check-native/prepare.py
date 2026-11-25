from pathlib import Path
import hashlib
import shutil
import sys

here = Path(__file__).resolve().parent
target = Path(sys.argv[1])
source = Path(sys.argv[2])
blobs = {}
for line in (here / 'blobs.txt').read_text().splitlines():
    identity, path = line.split(' ', 1)
    blobs[path] = identity
used = {
    'website-enquiry-intake': [
        'MANIFEST.json', 'source/client.ts', 'source/contract.ts', 'source/receiver.ts',
        'source/store.ts', 'source/reserved-session.mjs', 'source/committed-postgres-store.ts',
        'source/website-enquiries.sql', 'tests/postgres-local.sql', 'tests/deny-network.py',
        'airo/attempt/handoff.ts', 'airo/attempt/committed-mysql-store.ts',
        'airo/attempt/mysql-attempt-store.ts', 'airo/shared-route/candidate.patch',
        'airo/shared-route/business-answer-store.patch', 'airo/shared-route/native-purpose.mjs',
        'airo/attempt/native/quote-held.ts', 'airo/attempt/native/enquiries-schema.ts',
        'airo/attempt/native/enquiry-store.candidate.ts',
    ],
    'website-enquiry-readback': ['row-fidelity.patch', 'health-check-reference.patch'],
    'website-health-check-wiring': ['preflight.mjs', 'wire-health-check.mjs'],
    'website-health-check-integration': ['build.cjs', 'integration.mjs'],
}
for directory, files in used.items():
    for name in files:
        path = f'{directory}/{name}'
        data = (source / path).read_bytes()
        identity = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        assert identity == blobs[path], path
        (target / path).parent.mkdir(parents=True, exist_ok=True)
        (target / path).write_bytes(data)

fixture = target / 'website-health-check-integration/integration.mjs'
original = fixture.read_text()
original = '\n'.join(line for line in original.split('\n') if "const {PGlite}" not in line)
start = original.index('const db=await PGlite.create()')
end = original.index('globalThis.fixture=', start)
native = (here / 'native.mjs').read_text()
fixture.write_text(original[:start] + native + '\n' + original[end:])
print(f'Verified {sum(map(len, used.values()))} Git blobs from the combined source candidate')
