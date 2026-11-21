"""Rehearse the release settings comparison without reading an enquiry."""


def verify_durability_settings(admin, reader, query_path):
    query = query_path.read_text()

    def inspect(*, commit_mode_off=False, permanent_tables=True):
        reader.q('begin read only')
        try:
            reader.q('set local role authenticated')
            assert reader.q('show transaction_read_only') == [['on']]
            assert reader.q(
                "select has_table_privilege(current_user, 'public.website_enquiry_receipts', 'select')"
            ) == [['f']]
            if commit_mode_off:
                reader.q('set local synchronous_commit = off')
            assert reader.q(query) == [[
                't', 't', 't', 'f' if commit_mode_off else 't',
                't' if permanent_tables else 'f',
            ]]
        finally:
            reader.q('rollback')

    inspect()
    inspect(commit_mode_off=True)
    inspect()  # Closing the previous transaction restored the session default.

    # Use only the disposable schema. The second session observes committed DDL.
    admin.q('alter table public.audit_log rename to fixture_original_audit_log')
    inspect(permanent_tables=False)
    admin.q('create unlogged table public.audit_log (fixture_id integer)')
    inspect(permanent_tables=False)
    print('PASS 5 read-only durability comparisons; zero enquiry rows read', flush=True)
