"""PR133 native PostgreSQL synthetic verification. Never accepts a remote DSN.
Fresh disposable cluster; fixture roles only; no sends. Linux/libseccomp required.
"""
import argparse, ctypes as C, hashlib, importlib.util, json, os, pathlib, shlex, socket, subprocess, sys, tempfile, threading, time
ROOT=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--package-root',required=True,type=pathlib.Path,help='Extracted official Debian PostgreSQL 17 packages')
parser.add_argument('--source-root',required=True,type=pathlib.Path,help='Reviewed website-enquiry-intake archive')
parser.add_argument('--migration-root',required=True,type=pathlib.Path,help='Checkout containing pinned supabase/migrations')
parser.add_argument('--work-root',required=True,type=pathlib.Path,help='Disposable scratch directory')
parser.add_argument('--phase',choices=['controller','phase1','recovery'],default='controller')
parser.add_argument('--work',type=pathlib.Path)
args=parser.parse_args()
SOURCE=args.source_root.resolve();MIGRATIONS=args.migration_root.resolve()
PKG=args.package_root.resolve()
BIN=PKG/'usr/lib/postgresql/17/bin';SHARE=PKG/'usr/share/postgresql/17';LIB=PKG/'usr/lib/postgresql/17/lib'
SQL=SOURCE/'source/website-enquiries.sql'
assert hashlib.sha256(SQL.read_bytes()).hexdigest()=='d88ae0d2a49fd0f2837f7aa2984bd7f2217aeb88e421687903db9fb39586d0ac'
phase=args.phase
work=args.work.resolve() if args.work else pathlib.Path(tempfile.mkdtemp(prefix='feh_synthetic_',dir=args.work_root.resolve()))
assert work.name.startswith('feh_synthetic_')
data=work/'data';log=work/'server.log';port=55433
worker_args=['--package-root',str(PKG),'--source-root',str(SOURCE),'--migration-root',str(MIGRATIONS),'--work-root',str(args.work_root.resolve()),'--work',str(work)]
spec=importlib.util.spec_from_file_location('guard',ROOT/'network_guard.py')
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
pg=C.CDLL(str(PKG/'usr/lib/x86_64-linux-gnu/libpq.so.5'))
for name,rest,args in [
 ('PQconnectdb',C.c_void_p,[C.c_char_p]),('PQstatus',C.c_int,[C.c_void_p]),
 ('PQerrorMessage',C.c_char_p,[C.c_void_p]),('PQexec',C.c_void_p,[C.c_void_p,C.c_char_p]),
 ('PQresultStatus',C.c_int,[C.c_void_p]),('PQresultErrorMessage',C.c_char_p,[C.c_void_p]),
 ('PQntuples',C.c_int,[C.c_void_p]),('PQnfields',C.c_int,[C.c_void_p]),
 ('PQgetvalue',C.c_char_p,[C.c_void_p,C.c_int,C.c_int]),
 ('PQclear',None,[C.c_void_p]),('PQfinish',None,[C.c_void_p])]:
    f=getattr(pg,name);f.restype=rest;f.argtypes=args
connections=[]
class DB:
    def __init__(self,database='feh_synthetic_native'):
        self.c=pg.PQconnectdb(f'host=127.0.0.1 port={port} dbname={database} user=postgres connect_timeout=3 sslmode=disable'.encode())
        assert pg.PQstatus(self.c)==0, pg.PQerrorMessage(self.c).decode()
        connections.append(self)
        self.q("set statement_timeout='15s'")
    def q(self,sql):
        r=pg.PQexec(self.c,sql.encode())
        try:
            if pg.PQresultStatus(r) not in (1,2):raise RuntimeError(pg.PQresultErrorMessage(r).decode())
            return [[pg.PQgetvalue(r,i,j).decode() for j in range(pg.PQnfields(r))] for i in range(pg.PQntuples(r))]
        finally:pg.PQclear(r)
    def close(self):
        if self.c:pg.PQfinish(self.c);self.c=None
def control(*args):
    r=subprocess.run([str(BIN/'pg_ctl'),'-D',str(data),*args],capture_output=True,text=True,timeout=30)
    assert r.returncode==0,(r.stdout+r.stderr)
def start():control('-p',str(work/'postgres-isolated'),'-l',str(log),'-w','start')
def payload(n,message='Synthetic check'):
    return dict(submissionId=f'00000000-0000-4000-8000-{n:012}',submittedAt='2030-01-01T00:00:00.000Z',businessName='Synthetic business',contactName='Synthetic person',email='test@example.invalid',phone=None,meterNumbers=None,currentSupplier=None,message=message,smsConsent=None,sourcePage=None,attribution=dict.fromkeys(['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','gclid','fbclid']))
def invoke(db,n,message='Synthetic check'):
    p=json.dumps(payload(n,message)).replace("'","''")
    return json.loads(db.q(f"select public.ingest_website_enquiry('{p}'::jsonb)")[0][0])
def begin(db):db.q('begin; set local role synthetic_website_ingestor')
def count(db,n):
    sid=payload(n)['submissionId']
    return [int(x) for x in db.q(f"select (select count(*) from leads where notes::jsonb->>'websiteSubmissionId'='{sid}'),(select count(*) from website_enquiry_receipts where submission_id='{sid}'),(select count(*) from audit_log where correlation_id='{sid}' and action='website_enquiry_received')")[0]]
def wait_blocked(admin,pid):
    end=time.monotonic()+8
    while time.monotonic()<end:
        if admin.q(f"select wait_event_type,wait_event from pg_stat_activity where pid={pid}")==[['Lock','advisory']]:return
        time.sleep(.02)
    raise AssertionError('second session did not wait on advisory lock')
def async_call(db,n,message='Synthetic check'):
    out={}
    def target():
        try:out['receipt']=invoke(db,n,message)
        except BaseException as e:out['error']=str(e)
    t=threading.Thread(target=target);t.start();return t,out
results=[]
def passed(name):results.append(name);print(json.dumps({'pass':name}),flush=True)
def lock_network():
    guard.restrict()
    for family in (socket.AF_INET,socket.AF_INET6):
        try:socket.socket(family,socket.SOCK_STREAM)
        except PermissionError:pass
        else:raise AssertionError('new network socket allowed')
if phase=='controller':
    started=False
    wrapper=work/'postgres-isolated'
    wrapper.write_text('#!/bin/sh\nexec /usr/bin/python3 '+shlex.quote(str(ROOT/'network_guard.py'))+' '+shlex.quote(str(BIN/'postgres'))+' \"$@\"\n')
    wrapper.chmod(0o700)
    try:
        r=subprocess.run([str(BIN/'initdb'),'-D',str(data),'-L',str(SHARE),'-U','postgres','--auth-local=reject','--auth-host=trust','--no-locale','--encoding=UTF8'],capture_output=True,text=True,timeout=30)
        assert r.returncode==0,r.stderr
        (data/'pg_hba.conf').write_text('host all all 127.0.0.1/32 trust\n')
        with (data/'postgresql.conf').open('a') as f:f.write(f"\nlisten_addresses='127.0.0.1'\nport={port}\nunix_socket_directories=''\ndynamic_library_path='{LIB}'\nfsync=on\nsynchronous_commit=on\nfull_page_writes=on\n")
        start();started=True
        bootstrap=DB('postgres');bootstrap.q('create database feh_synthetic_native');bootstrap.close()
        child=subprocess.Popen(['/usr/bin/python3',__file__,*worker_args,'--phase','phase1'],stdout=subprocess.PIPE,stdin=subprocess.PIPE,text=True,env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'})
        ready=False
        for line in child.stdout:
            print(line,end='',flush=True)
            if line.strip()=='CRASH_READY':ready=True;break
        assert ready,'phase1 failed before crash boundary'
        control('-m','immediate','-w','stop');started=False
        child.communicate('stopped\n',timeout=10);assert child.returncode==0
        start();started=True
        r=subprocess.run(['/usr/bin/python3',__file__,*worker_args,'--phase','recovery'],env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'},timeout=20)
        assert r.returncode==0
        assert 'database system was not properly shut down; automatic recovery in progress' in log.read_text()
        print(json.dumps({'passed':9,'engine':'native PostgreSQL 17.11','migrations':63,'network':'preconnected loopback DB sockets only; worker socket/connect syscalls denied; server outbound connect denied','recovery':'WAL automatic recovery observed','remoteDDL':False,'sends':0,'workdir':str(work)}),flush=True)
    finally:
        if started:control('-m','immediate','-w','stop')
    sys.exit(0)
if phase=='recovery':
    admin=DB();lock_network()
    assert count(admin,7)==[0,0,0];passed('abrupt-shutdown-uncommitted-rows-absent-after-recovery')
    assert count(admin,8)==[1,1,1];passed('abrupt-shutdown-committed-receipt-survives-without-replay')
    assert admin.q("select count(*) from leads where consent_given is distinct from false or telephone is not null or lead_owner is not null")==[['0']]
    assert len(results)==2
    admin.close();sys.exit(0)
# Open a fixed pool to this disposable loopback database before denying ALL new
# sockets and connect calls. Application SQL is loaded only after the guard.
admin=DB();pool=[DB() for _ in range(12)]
DB=lambda:pool.pop()
lock_network()
try:
    assert admin.q("select host(inet_server_addr()), current_database()") == [['127.0.0.1','feh_synthetic_native']]
    assert admin.q('show data_directory')==[[str(data)]]
    admin.q("create schema auth;create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public,auth to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;alter default privileges in schema public grant all on functions to anon,authenticated,service_role;")
    provenance=json.loads((ROOT/'migration-provenance.json').read_text());assert len(provenance)==63
    for item in provenance:
        b=(MIGRATIONS/item['path']).read_bytes()
        assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==item['sha']
        admin.q(b.decode())
    admin.q(SQL.read_text())
    passed('native-63-migration-schema-compatibility')
    for role in ('anon','authenticated','service_role'):
        assert admin.q(f"select has_function_privilege('{role}','public.ingest_website_enquiry(jsonb)','execute'),has_table_privilege('{role}','public.website_enquiry_receipts','select,insert,update,delete,truncate,references,trigger')")==[['f','f']]
        admin.q(f'begin;set local role {role}')
        try:invoke(admin,99)
        except RuntimeError as e:assert 'permission denied' in str(e)
        else:raise AssertionError('forbidden role executed')
        finally:admin.q('rollback')
    admin.q('create role synthetic_website_ingestor nologin;grant usage on schema public to synthetic_website_ingestor;grant execute on function public.ingest_website_enquiry(jsonb) to synthetic_website_ingestor')
    assert admin.q("select has_table_privilege('synthetic_website_ingestor','public.leads','select,insert,update,delete'),has_table_privilege('synthetic_website_ingestor','public.website_enquiry_receipts','select,insert,update,delete')")==[['f','f']]
    passed('closed-role-acls-and-local-function-only-role')
    # Same-ID calls are concurrent: second backend observed waiting, not sequential replay.
    for n,changed in ((1,False),(2,True)):
        a,b=DB(),DB();pid=int(b.q('select pg_backend_pid()')[0][0]);begin(a);begin(b)
        first=invoke(a,n);t,out=async_call(b,n,'Changed synthetic input' if changed else 'Synthetic check')
        wait_blocked(admin,pid);assert count(admin,n)==[0,0,0]
        a.q('commit');t.join(8);assert not t.is_alive();assert 'error' not in out,out
        b.q('commit');second=out['receipt']
        assert second['outcome']==('conflict' if changed else 'duplicate')
        if not changed:assert first['leadId']==second['leadId']
        assert count(admin,n)==[1,1,1]
        assert admin.q(f"select notes::jsonb->>'message' from leads where id={int(first['leadId'])}")==[['Synthetic check']]
        a.close();b.close();passed('concurrent-conflict-no-overwrite' if changed else 'concurrent-identical-one-durable-lead')
    # Different IDs may commit while the first transaction remains open.
    a,b=DB(),DB();begin(a);begin(b);invoke(a,3);t,out=async_call(b,4);t.join(5)
    assert not t.is_alive() and 'error' not in out,out
    b.q('commit');assert count(admin,3)==[0,0,0] and count(admin,4)==[1,1,1]
    a.q('commit');a.close();b.close();passed('different-ids-progress-independently')
    # A second already-submitted transaction is released after first rolls back.
    a,b=DB(),DB();pid=int(b.q('select pg_backend_pid()')[0][0]);begin(a);begin(b);invoke(a,5)
    t,out=async_call(b,5);wait_blocked(admin,pid);a.q('rollback');t.join(8)
    assert not t.is_alive() and out.get('receipt',{}).get('outcome')=='created',out
    b.q('commit');assert count(admin,5)==[1,1,1];a.close();b.close();passed('rollback-releases-already-inflight-waiter')
    # SQL returned a receipt, but deferred failure at COMMIT must erase all writes.
    admin.q("create function public.synthetic_commit_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic_commit_failure';end$$;create constraint trigger synthetic_commit_failure after insert on public.website_enquiry_receipts deferrable initially deferred for each row execute function public.synthetic_commit_failure()")
    a=DB();begin(a);assert invoke(a,6)['outcome']=='created'
    try:a.q('commit')
    except RuntimeError as e:assert 'synthetic_commit_failure' in str(e)
    else:raise AssertionError('deferred failure committed')
    assert count(admin,6)==[0,0,0];a.close();admin.q('drop trigger synthetic_commit_failure on public.website_enquiry_receipts;drop function public.synthetic_commit_failure()');passed('commit-time-failure-rolls-back-all-three-writes')
    # Abrupt whole-cluster shutdown (SIGQUIT, no clean checkpoint), then WAL recovery.
    a,b=DB(),DB();begin(a);invoke(a,7);begin(b);invoke(b,8);b.q('commit')
    assert count(admin,7)==[0,0,0] and count(admin,8)==[1,1,1]
    assert len(results)==7
    print('CRASH_READY',flush=True)
    assert sys.stdin.readline().strip()=='stopped'
finally:
    for c in connections:c.close()
