import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const middlewareSource = readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8");
const sessionSource = readFileSync(new URL("./session.ts", import.meta.url), "utf8");

test("middleware treats unresolved role lookups as MFA-required instead of non-admin", () => {
  assert.match(middlewareSource, /requiresMfaForRoleResolution/);
  assert.match(middlewareSource, /roleLookupFailed = Boolean\(roleError\)/);
  assert.match(middlewareSource, /catch \{/);
  assert.doesNotMatch(middlewareSource, /const isAdmin = roleData\?\.role === "admin"/);
});

test("server guard performs an independent fail-closed MFA role lookup", () => {
  assert.match(sessionSource, /requiresMfaForRoleLookup/);
  assert.match(sessionSource, /requiresMfaForRoleResolution/);
  assert.match(sessionSource, /catch \{/);
  assert.match(sessionSource, /return true;/);
});
