import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync("../supabase/migrations/20260831120000_health_check_crm_persistence.sql", "utf8");
const action = readFileSync("src/app/business-energy-quote/actions.ts", "utf8");
const legacyRoute = readFileSync("src/app/business-energy-quote/page.tsx", "utf8");
const canonicalRoute = readFileSync("src/app/free-business-energy-health-check/page.tsx", "utf8");

test("canonical route shares the accepted implementation and legacy route redirects safely", () => {
  assert.match(canonicalRoute, /health-check-page/);
  assert.match(legacyRoute, /permanentRedirect/);
  assert.match(legacyRoute, /free-business-energy-health-check/);
});

test("Health Check action maps every dedicated CRM field with safe null defaults", () => {
  for (const parameter of ["p_energy_supply", "p_enquiry_reason", "p_campaign_id", "p_contract_end", "p_lead_owner", "p_next_action", "p_follow_up_required", "p_follow_up_date"]) {
    assert.match(action, new RegExp(parameter));
  }
  assert.match(action, /p_lead_owner: null/);
  assert.match(action, /p_follow_up_date: null/);
  assert.match(action, /rpc\("ingest_health_check_lead"/);
  assert.match(action, /disposition: "failed"/);
  assert.match(action, /"created" \|\| disposition === "duplicate_suppressed"/);
});

test("migration keeps the old RPC contract and grants no direct table writes", () => {
  assert.match(migration, /existing 13-argument callers keep their bigint[\s\S]+return contract/);
  assert.match(migration, /create or replace function public\.ingest_public_lead/);
  assert.match(migration, /create function public\.ingest_health_check_lead/);
  assert.match(migration, /public\._ingest_public_lead_core/);
  assert.match(migration, /returns table \(lead_id bigint, disposition text\)/);
  assert.match(migration, /'duplicate_suppressed'::text/);
  assert.match(migration, /'created'::text/);
  assert.match(migration, /returns bigint language plpgsql/);
  assert.match(migration, /returns jsonb language plpgsql/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path to ''/);
  assert.match(migration, /revoke all on function/);
  assert.match(migration, /grant execute on function[\s\S]+to anon/);
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)\s+on\s+(table\s+)?public\.leads/i);
});
