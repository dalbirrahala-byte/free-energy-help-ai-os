"""Offline safety tests. These do NOT demonstrate a successful database install."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('runner', Path(__file__).with_name('staging_execution.py'))
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class SafetyTests(unittest.TestCase):
    def valid_env(self):
        return dict(GITHUB_ACTIONS='true', GITHUB_EVENT_NAME='workflow_dispatch',
                    GITHUB_REPOSITORY=runner.REPOSITORY, GITHUB_REF=runner.BRANCH)

    def test_valid_manual_scope(self):
        runner.scope_guard(self.valid_env())

    def test_reject_scope_variants(self):
        for key, value in [('GITHUB_ACTIONS','false'),('GITHUB_EVENT_NAME','push'),
                           ('GITHUB_EVENT_NAME','pull_request'),('GITHUB_REF','refs/heads/main'),
                           ('GITHUB_REF','refs/tags/ops/staging-61-execution-20261026'),
                           ('GITHUB_REPOSITORY','other/free-energy-help-ai-os')]:
            with self.subTest(key=key,value=value), self.assertRaises(RuntimeError):
                runner.scope_guard({**self.valid_env(),key:value})

    def test_project_fingerprint(self):
        valid = dict(id=runner.TARGET,name=runner.PROJECT_NAME,status='ACTIVE_HEALTHY',
                     database={'host':f'db.{runner.TARGET}.supabase.co'})
        runner.verify_project(valid)
        for key,value in [('id','kupuswwutonsagftivkv'),('name','production'),
                          ('status','INACTIVE'),('database',{'host':'db.kupuswwutonsagftivkv.supabase.co'})]:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                runner.verify_project({**valid,key:value})

    def test_history_empty_or_exact_only(self):
        expected=[{'version':str(i),'name':f'm{i}'} for i in range(61)]
        self.assertEqual(runner.classify_history([],expected),'empty')
        self.assertEqual(runner.classify_history(expected,expected),'complete')
        for actual in [expected[:1],expected[:-1],list(reversed(expected)),expected+[expected[0]],
                       [{'version':'other','name':'wrong'}]]:
            with self.subTest(count=len(actual)), self.assertRaises(RuntimeError):
                runner.classify_history(actual,expected)

    def test_secret_and_url_redaction(self):
        with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'synthetic-token','SUPABASE_DB_PASSWORD':'synthetic-password'}):
            self.assertEqual(runner.clean('synthetic-token synthetic-password postgres://user:other@host/db'),
                             '[REDACTED] [REDACTED] [REDACTED_DATABASE_URL]')

    def test_malformed_manifest_stops(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'sha256_manifest.json').write_text('[]')
            with self.assertRaisesRegex(RuntimeError,'checksum'):
                runner.validate_files(Path(d))

    def test_api_rejects_unapproved_paths_before_network(self):
        with patch.object(runner.urllib.request,'build_opener') as opener:
            for path in ['/secrets','/database/config','https://example.invalid']:
                with self.assertRaises(RuntimeError):
                    runner.api(path)
            opener.assert_not_called()

    def test_empty_business_data_required(self):
        with patch.object(runner,'query',return_value=[{'leads':1,'auth_users':0}]):
            with self.assertRaises(RuntimeError):
                runner.empty_business_data()

    def test_no_write_after_invalid_scope(self):
        with patch.dict(os.environ,{},clear=True),patch.object(runner,'api') as api,patch.object(runner,'run') as run:
            with self.assertRaises(RuntimeError):
                runner.execute()
            api.assert_not_called()
            run.assert_not_called()

    def test_no_write_without_staging_password(self):
        with patch.dict(os.environ,self.valid_env(),clear=True),patch.object(runner,'api') as api:
            with self.assertRaisesRegex(RuntimeError,'PASSWORD missing'):
                runner.execute()
            api.assert_not_called()

    def test_partial_history_never_reaches_cli(self):
        expected = [{'version':str(i),'name':f'm{i}'} for i in range(61)]
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ, {
            **self.valid_env(),'RUNNER_TEMP':d,'SUPABASE_DB_PASSWORD':'synthetic-only'
        },clear=True), patch.object(runner,'validate_files',return_value=expected), \
            patch.object(runner,'verify_project'), patch.object(runner,'api'), \
            patch.object(runner,'history',return_value=expected[:1]), patch.object(runner,'run') as cli:
            with self.assertRaisesRegex(RuntimeError,'Partial or unexpected history'):
                runner.execute()
            cli.assert_not_called()
            evidence=json.loads(runner.evidence_path().read_text())
            self.assertEqual(evidence['installed_this_run'],[])
            self.assertFalse(evidence['installation_attempted'])

    def test_apply_failure_is_not_retried_and_reports_actual_prefix(self):
        expected = [{'version':str(i),'name':f'm{i}'} for i in range(61)]
        empty = dict(public_tables=0,public_functions=0,auth_users=0,storage_objects=0)
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ, {
            **self.valid_env(),'RUNNER_TEMP':d,'SUPABASE_DB_PASSWORD':'synthetic-only'
        },clear=True), patch.object(runner,'validate_files',return_value=expected), \
            patch.object(runner,'verify_project'), patch.object(runner,'api'), \
            patch.object(runner,'history',side_effect=[[],[],expected[:2]]), \
            patch.object(runner,'snapshot',return_value=empty), \
            patch.object(runner,'run',side_effect=['dry-run',RuntimeError('simulated SQL error')]) as cli, \
            patch.object(runner,'empty_business_data') as tests:
            with self.assertRaisesRegex(RuntimeError,'simulated SQL error'):
                runner.execute()
            self.assertEqual(cli.call_count,2)
            self.assertEqual(cli.call_args_list[0].args[0][-1],'--dry-run')
            self.assertEqual(cli.call_args_list[1].args[0][-1],'--yes')
            tests.assert_not_called()
            evidence=json.loads(runner.evidence_path().read_text())
            self.assertEqual(evidence['installed_this_run'],expected[:2])
            self.assertEqual(evidence['synthetic_tests'],'not executed')

    def test_preflight_drift_stops_before_apply(self):
        expected = [{'version':str(i),'name':f'm{i}'} for i in range(61)]
        empty = dict(public_tables=0,public_functions=0,auth_users=0,storage_objects=0)
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ, {
            **self.valid_env(),'RUNNER_TEMP':d,'SUPABASE_DB_PASSWORD':'synthetic-only'
        },clear=True), patch.object(runner,'validate_files',return_value=expected), \
            patch.object(runner,'verify_project'), patch.object(runner,'api'), \
            patch.object(runner,'history',side_effect=[[],expected[:1],expected[:1]]), \
            patch.object(runner,'snapshot',return_value=empty), patch.object(runner,'run') as cli:
            with self.assertRaisesRegex(RuntimeError,'Preflight drift'):
                runner.execute()
            cli.assert_called_once()
            self.assertEqual(cli.call_args.args[0][-1],'--dry-run')
            self.assertEqual(json.loads(runner.evidence_path().read_text())['installed_this_run'],[])

if __name__ == '__main__':
    unittest.main()
