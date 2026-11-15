// Structural regression guard only: a hosted anonymous redirect matrix is still required.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const middlewareSource = await readFile(new URL("../../middleware.ts", import.meta.url), "utf8");
const landingRouteSource = await readFile(
  new URL("../../app/free-business-energy-health-check/page.tsx", import.meta.url),
  "utf8",
);

function publicPathsFromSource(source: string): string[] {
  const match = source.match(/^const PUBLIC_PATHS = (\[[^\n;]+\]);/m);
  assert.ok(match, "explicit public-route list must remain present");
  const paths = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  assert.ok(paths.length > 0, "public-route list must not be empty");
  return paths;
}

test("Health Check exact path stays public without opening CRM navigation", () => {
  const paths = publicPathsFromSource(middlewareSource);
  assert.ok(paths.includes("/free-business-energy-health-check"), "advert destination must not redirect to CRM sign-in");
  for (const path of ["/", "/leads", "/customers", "/mfa/challenge", "/mfa/enroll", "/api"]) {
    assert.ok(!paths.includes(path), `protected path unexpectedly public: ${path}`);
  }
  assert.equal(new Set(paths).size, paths.length, "duplicate public-route entries");
  assert.match(landingRouteSource, /business-energy-quote\/health-check-page/, "canonical route must render the intended Health Check");
});

test("FEH CRM still authenticates and enforces protected-route MFA", () => {
  assert.match(middlewareSource, /supabase\.auth\.getUser\(\)/, "middleware must validate the user server-side");
  assert.match(middlewareSource, /if \(!user && !isPublicPath\(pathname\)\)/);
  assert.match(middlewareSource, /NextResponse\.redirect\(loginUrl\)/);
  assert.match(middlewareSource, /requiresMfaForRoleLookup/);
  assert.match(middlewareSource, /decideAdminMfaRoute\(true,/);
  assert.match(middlewareSource, /pathname !== "\/mfa\/challenge"/);
  assert.match(middlewareSource, /pathname !== "\/mfa\/enroll"/);
});

test("Public-site exception remains exact and narrow", () => {
  assert.match(middlewareSource, /if \(PUBLIC_PATHS\.includes\(pathname\)\) return true;/);
  assert.match(middlewareSource, /const PUBLIC_PREFIXES = \["\/leads\/web\/"\];/);
  assert.doesNotMatch(middlewareSource, /PUBLIC_PREFIXES[^\n]*["']\/["']/, "no catch-all public prefix");
});
