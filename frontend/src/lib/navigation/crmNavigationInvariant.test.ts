import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const protectedNavigationSurfaces = [
  ["src/app/customers/page.tsx", 'activeHref="/customers"'],
  ["src/app/customers/new/page.tsx", 'activeHref="/customers"'],
  ["src/app/customers/[id]/page.tsx", 'activeHref="/customers"'],
  ["src/app/customers/[id]/edit/page.tsx", 'activeHref="/customers"'],
  ["src/components/leads/LeadsPageClient.tsx", 'activeHref="/leads"'],
  ["src/app/leads/new/page.tsx", 'activeHref="/leads"'],
  ["src/app/leads/[id]/page.tsx", 'activeHref="/leads"'],
  ["src/app/leads/[id]/edit/page.tsx", 'activeHref="/leads"'],
  ["src/app/leads/[id]/activity/new/page.tsx", 'activeHref="/leads"'],
  ["src/app/leads/[id]/activity/[activityId]/edit/page.tsx", 'activeHref="/leads"'],
  ["src/app/leads/web/[ref]/page.tsx", 'activeHref="/leads"'],
] as const;

test("core lead and customer surfaces retain the shared FEH AppShell", () => {
  for (const [path, activeHref] of protectedNavigationSurfaces) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /AppShell/, `${path} must use the shared AppShell`);
    assert.ok(source.includes(activeHref), `${path} must keep ${activeHref} active`);
  }
});

test("AppShell keeps Leads and Customers in the primary navigation", () => {
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  assert.ok(shell.includes('href: "/leads"'), "AppShell must retain the Leads navigation item");
  assert.ok(shell.includes('href: "/customers"'), "AppShell must retain the Customers navigation item");
});

test("protected CRM surfaces do not fall back to standalone full-screen wrappers", () => {
  for (const [path] of protectedNavigationSurfaces) {
    const source = readFileSync(path, "utf8");
    assert.ok(
      !source.includes('<main className="min-h-screen bg-slate-100 p-8">'),
      `${path} must not bypass AppShell with the legacy standalone wrapper`,
    );
  }
});
