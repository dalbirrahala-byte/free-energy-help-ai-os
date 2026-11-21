"""Exercise both website insert statements in one network-isolated disposable MySQL."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import tempfile

archive, mysqlroot = (Path(arg).resolve() for arg in sys.argv[1:])
native = archive / 'airo/attempt/native'
route = archive / 'airo/shared-route'
guard = archive / 'tests/deny-network.py'


def pinned(path, expected):
    data = path.read_bytes()
    assert hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() == expected
    return data.decode()


def insert(source, number, state, answers=None):
    values = dict(submissionId=f'00000000-0000-4000-8000-{number:012d}',
                  submittedAt='2030-01-01T00:00:00.000Z', businessName='Synthetic Ltd',
                  contactName='Synthetic contact', email='test@example.invalid', businessAnswers=answers)
    statements = re.findall(r'db\.execute\(sql`\s*(INSERT IGNORE INTO enquiries[^`]+)`\)', source)
    assert len(statements) == 1

    def literal(match):
        name = match[1]
        if name == 'initialCrmStatus':
            value = state
        else:
            field = re.fullmatch(r'input\.(\w+)(?: \?\? null)?', name)
            assert field, 'Unexpected SQL parameter'
            value = values.get(field[1])
        return 'NULL' if value is None else "'" + value.replace("'", "''") + "'"

    return re.sub(r'\$\{([^}]+)\}', literal, statements[0])


with tempfile.TemporaryDirectory(prefix='feh133-roll-') as directory:
    work = Path(directory)
    for name, sha in [('quote-held.ts','31c0dc1b237c2e911d5000540d44a7a6530b5278'),
                      ('enquiry-store.candidate.ts','661d01e7b9c75e80b7e791d14817845cdb30a054'),
                      ('enquiries-schema.ts','16efcd714d25b760604eb56ae83b159bc1e1171b')]:
        (work/name).write_text(pinned(native/name, sha))
    store = work/'enquiry-store.candidate.ts'
    for patch, sha in [('candidate.patch','15a944a4e594d2cb4aab59c1b29f2f2ee6c91e30'),
                       ('business-answer-store.patch','fb56c709fcc1a8ef2fdff1ecd91a4290d14c9e25')]:
        subprocess.run(['git','apply','-'], input=pinned(route/patch, sha), text=True, cwd=work, check=True)
        if patch == 'candidate.patch':
            legacy = store.read_text()
    schema = pinned(native/'full-enquiries.fixture.sql','52e47b7807a7cb7c85e38afc0f218f8c7102c175')
    ddl = pinned(route/'business-answer-column.sql','025911d6bfa73a617003122588a099aaed937aef')
    pinned(guard,'3e8f7c946cda0da555852bfddf68c26f1c138c1f')
    original_columns = re.findall(r'^  `(\w+)`', schema, flags=re.M)
    assert len(original_columns) == 24
    legacy_digest = 'sha2(json_array(' + ','.join(original_columns) + '),256)'
    digest = 'sha2(json_array(' + ','.join(original_columns + ['business_answers']) + '),256)'
    answers = '{"sites":"2-5"}'
    statements = ['create database fixture', 'use fixture', schema, insert(legacy,901,'excluded'),
                  f'create temporary table pre_upgrade as select id,{legacy_digest} as digest from enquiries',
                  ddl, insert(store.read_text(),902,'uncertain',answers),
                  "update enquiries set owner_email_status='sent', visitor_email_status='sent' where id=2",
                  f'create temporary table saved as select id,{digest} as digest from enquiries',
                  insert(legacy,903,'excluded'),
                  f"""select json_array(version(),@@skip_networking,(select count(*) from enquiries),
                      (select count(*) from enquiries join pre_upgrade using(id) where pre_upgrade.digest={legacy_digest}),
                      (select count(*) from enquiries join saved using(id) where saved.digest={digest}),
                      (select count(*) from enquiries where id in (1,3) and business_answers is null
                       and crm_status='excluded' and visitor_email_status='pending' and owner_email_status='pending'),
                      (select count(*) from enquiries where id=2 and binary business_answers='{answers}'
                       and crm_status='uncertain' and owner_email_status='sent' and visitor_email_status='sent'))
                      into dumpfile '{work}/result'"""]
    script = '\n'.join(' '.join(line.strip() for line in stmt.splitlines()
                              if not line.lstrip().startswith('--')).strip().rstrip(';')+';' for stmt in statements)
    sqlfile = work/'test.sql'
    sqlfile.write_text(script+'\n')
    result = subprocess.run(['/usr/bin/python3',str(guard),'/usr/bin/env',
        f'LD_LIBRARY_PATH={mysqlroot}/lib/x86_64-linux-gnu',str(mysqlroot/'sbin/mysqld'),
        '--no-defaults','--initialize-insecure','--skip-networking','--mysqlx=0','--innodb-use-native-aio=0',
        f'--basedir={mysqlroot}',f'--datadir={work}/data',f'--lc-messages-dir={mysqlroot}/share/mysql-8.4',
        f'--secure-file-priv={work}',f'--init-file={sqlfile}'], env={}, capture_output=True, timeout=70)
    assert result.returncode == 0 and b'[ERROR]' not in result.stderr, 'Disposable MySQL fixture failed'
    counts = json.loads((work/'result').read_text())
    assert counts[0].startswith('8.4.13') and counts[1:] == [1,3,1,2,2,1], counts
    print('PASS MySQL 8.4.13: three unique enquiry rows, both original rows intact, earlier writer works after rollback')
