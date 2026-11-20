"""Transactional rehearsal on the disposable native_pg fixture only."""
import hashlib
import json


def verify_upgrade(writer, observer, payload, previous_file, current_file):
    previous = previous_file.read_bytes()
    assert hashlib.sha256(previous).hexdigest() == 'd88ae0d2a49fd0f2837f7aa2984bd7f2217aeb88e421687903db9fb39586d0ac'
    current = current_file.read_text()
    # The parent harness also pins the complete current installer by SHA-256.
    signature = 'create function public.ingest_website_enquiry(p_payload jsonb)'
    start = current.index(signature)
    end = current.index('\n$$;', start) + len('\n$$;')
    replace_function = current[start:end].replace('create function', 'create or replace function', 1)

    def send(data):
        encoded = json.dumps(data).replace("'", "''")
        return json.loads(writer.q(f"select public.ingest_website_enquiry('{encoded}'::jsonb)")[0][0])

    def snapshot():
        return observer.q("""
          select to_jsonb(r), to_jsonb(l), to_jsonb(a)
          from public.website_enquiry_receipts r
          join public.leads l on l.id=r.lead_id
          join public.audit_log a on a.correlation_id=r.submission_id
            and a.entity_id=l.id::text and a.action='website_enquiry_received'
          order by r.submission_id
        """)

    identity = """select oid, proowner, proacl, prosecdef, proconfig
        from pg_proc where oid='public.ingest_website_enquiry(jsonb)'::regprocedure"""
    counts = """select (select count(*) from public.leads),
        (select count(*) from public.website_enquiry_receipts),
        (select count(*) from public.audit_log where action='website_enquiry_received')"""
    writer.q(previous.decode())
    catalog = observer.q(identity)
    assert len(catalog) == 1
    for role in ('anon','authenticated','service_role'):
        assert observer.q(f"select has_function_privilege('{role}','public.ingest_website_enquiry(jsonb)','execute')") == [['f']]
    legacy = payload(701)
    first = send(legacy)
    assert first['outcome'] == 'created' and first['submissionId'] == legacy['submissionId']
    saved = snapshot()
    assert len(saved) == 1
    original_body = observer.q("select prosrc from pg_proc where oid='public.ingest_website_enquiry(jsonb)'::regprocedure")

    writer.q('begin')
    writer.q(replace_function)
    provisional = send({**payload(702), 'businessAnswers':{'sites':'2-5'}})
    assert provisional['outcome'] == 'created'
    assert observer.q(counts) == [['1','1','1']]
    writer.q('rollback')
    assert observer.q(identity) == catalog and snapshot() == saved
    assert observer.q("select prosrc from pg_proc where oid='public.ingest_website_enquiry(jsonb)'::regprocedure") == original_body
    assert observer.q(counts) == [['1','1','1']]

    writer.q('begin')
    writer.q(replace_function)
    writer.q('commit')
    assert observer.q(identity) == catalog and snapshot() == saved
    assert send(legacy) == {**first, 'outcome':'duplicate'}
    assert send({**legacy,'businessAnswers':{'sites':'2-5'}}) == {'outcome':'conflict'}
    assert snapshot() == saved and observer.q(counts) == [['1','1','1']]

    enriched = {**payload(703), 'businessAnswers':{'sites':'2-5'}}
    accepted = send(enriched)
    assert accepted['outcome'] == 'created' and accepted['submissionId'] == enriched['submissionId']
    assert accepted['leadId'] != first['leadId']
    assert observer.q(counts) == [['2','2','2']]
    after = snapshot()
    assert len(after) == 2 and after[0] == saved[0]
    assert json.loads(json.loads(after[1][1])['notes'])['businessAnswers'] == enriched['businessAnswers']
    assert send(enriched) == {**accepted,'outcome':'duplicate'}
    assert snapshot() == after and observer.q(counts) == [['2','2','2']]
    print('PASS native upgrade: rollback isolated, catalog identity and ACL preserved, legacy receipt and audit intact, enriched duplicate/conflict correct', flush=True)
