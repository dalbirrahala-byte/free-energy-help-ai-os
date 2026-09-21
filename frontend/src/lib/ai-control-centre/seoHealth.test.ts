import assert from "node:assert/strict";
import test from "node:test";

import {
  isUserAgentFullyBlocked,
  resolveWebsiteSeoStatus,
} from "./seoHealth.ts";

function response(body: string, status = 200, contentType = "text/plain") {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

test("detects a wildcard full-site block for OAI-SearchBot", () => {
  const robots = `
User-agent: *
Disallow: /
`;

  assert.equal(isUserAgentFullyBlocked(robots, "OAI-SearchBot"), true);
});

test("specific OAI-SearchBot rules override a wildcard block", () => {
  const robots = `
User-agent: *
Disallow: /

User-agent: OAI-SearchBot
Allow: /
`;

  assert.equal(isUserAgentFullyBlocked(robots, "OAI-SearchBot"), false);
});

test("reports Connected only after live homepage, robots and sitemap checks pass", async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = input.toString();

    if (url.endsWith("/robots.txt")) {
      return response("User-agent: *\nAllow: /\n");
    }

    if (url.endsWith("/sitemap.xml")) {
      return response(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        200,
        "application/xml",
      );
    }

    return response("<html><body>FEH</body></html>", 200, "text/html");
  };

  const result = await resolveWebsiteSeoStatus(
    fetcher,
    "https://www.freeenergyhelp.co.uk",
  );

  assert.equal(result.status, "Connected");
  assert.match(result.detail, /OAI-SearchBot/);
});

test("reports Unavailable when robots rules fully block OAI-SearchBot", async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = input.toString();

    if (url.endsWith("/robots.txt")) {
      return response("User-agent: OAI-SearchBot\nDisallow: /\n");
    }

    if (url.endsWith("/sitemap.xml")) {
      return response(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        200,
        "application/xml",
      );
    }

    return response("<html></html>", 200, "text/html");
  };

  const result = await resolveWebsiteSeoStatus(fetcher);

  assert.equal(result.status, "Unavailable");
  assert.match(result.detail, /blocked/);
});

test("reports Not configured when sitemap.xml is missing", async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = input.toString();

    if (url.endsWith("/robots.txt")) {
      return response("User-agent: *\nAllow: /\n");
    }

    if (url.endsWith("/sitemap.xml")) {
      return response("Not found", 404);
    }

    return response("<html></html>", 200, "text/html");
  };

  const result = await resolveWebsiteSeoStatus(fetcher);

  assert.equal(result.status, "Not configured");
  assert.match(result.detail, /sitemap\.xml/);
});
