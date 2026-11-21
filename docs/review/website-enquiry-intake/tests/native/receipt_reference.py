"""Exercise a status-only read of one known fixture UUID across transaction boundaries."""


def verify_reference(writer, reader, query_file, invoke, payload):
    reader.q('prepare fixture_reference(uuid) as ' + query_file.read_text())

    def check(number, expected):
        reference = payload(number)['submissionId']
        reader.q('begin read only')
        try:
            assert reader.q('show transaction_read_only') == [['on']]
            assert reader.q(f"execute fixture_reference('{reference}')") == [[expected]]
        finally:
            reader.q('rollback')

    check(801, 'unconfirmed')
    writer.q('begin')
    receipt = invoke(writer, 801)
    assert receipt['outcome'] == 'created'
    check(801, 'unconfirmed')
    writer.q('commit')
    check(801, 'correlated')
    check(802, 'unconfirmed')
    writer.q('begin')
    assert invoke(writer, 802)['outcome'] == 'created'
    writer.q('rollback')
    check(802, 'unconfirmed')

    # Each disposable record starts with the authentic shape written by the RPC.
    # Change just its audit provenance; the linked lead and receipt remain visible.
    metadata_changes = (
        (803, "metadata - 'source'"),
        (804, "metadata || jsonb_build_object('source', 'other-fixture-source')"),
        (805, "metadata || jsonb_build_object('submission_id', '" + payload(801)['submissionId'] + "')"),
    )
    for number, expression in metadata_changes:
        assert invoke(writer, number)['outcome'] == 'created'
        check(number, 'correlated')
        reference = payload(number)['submissionId']
        assert writer.q(f"""update public.audit_log set metadata = {expression}
            where action='website_enquiry_received' and correlation_id='{reference}'
            returning 1""") == [['1']]
        check(number, 'unconfirmed')

    # A partial or contradictory audit trail cannot confirm a reference.
    ref = payload(801)['submissionId']
    lead = int(receipt['leadId'])
    writer.q(f"""insert into public.audit_log(action,entity_type,entity_id,correlation_id,result)
        values ('website_enquiry_received','lead','{lead + 1}','{ref}','success')""")
    check(801, 'unconfirmed')
    reader.q('begin read only; set local role authenticated')
    try:
        reader.q(f"execute fixture_reference('{ref}')")
    except RuntimeError as error:
        assert 'permission denied' in str(error)
    else:
        raise AssertionError('Expected receipt access denial')
    finally:
        reader.q('rollback')
    print('PASS 12 status reads and 1 restricted-role denial; zero returned payload fields', flush=True)
