import assert from "node:assert/strict";
import test from "node:test";

import {
  isHomepageIndexingBlocked,
  isUserAgentFullyBlocked,
  isXRobotsTagNoindexForUserAgent,
  resolveWebsiteSeoStatus,
} from "./seoHealth.ts";

function response(
  body: string,
  status = 200,
  contentType = "text/plain",
  headers: Record<string, string> = {},
) {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      ...headers,
    },
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

test("detects homepage noindex in HTML meta robots directives", () => {
  const homepageResponse = response(
    '<html><head><meta content="follow, NOINDEX" name="robots"></head></html>',
    200,
    "text/html",
  );

  assert.equal(
    isHomepageIndexingBlocked(
      homepageResponse,
      '<html><head><meta content="follow, NOINDEX" name="robots"></head></html>',
    ),
    true,
  );
});

test("detects homepage noindex in X-Robots-Tag headers", () => {
  const homepageResponse = response(
    "<html><body>FEH</body></html>",
    200,
    "text/html",
    { "x-robots-tag": "noarchive, noindex" },
  );

  assert.equal(
    isHomepageIndexingBlocked(
      homepageResponse,
      "<html><body>FEH</body></html>",
    ),
    true,
  );
});

test("ignores X-Robots-Tag noindex scoped to a different crawler", () => {
  assert.equal(
    isXRobotsTagNoindexForUserAgent(
      "googlebot: noindex, nofollow",
      "OAI-SearchBot",
    ),
    false,
  );
});

test("detects X-Robots-Tag noindex scoped to OAI-SearchBot", () => {
  assert.equal(
    isXRobotsTagNoindexForUserAgent(
      "googlebot: nofollow, OAI-SearchBot: noindex, nofollow",
      "OAI-SearchBot",
    ),
    true,
  );
});

test("keeps global noindex active after value-bearing robots directives", () => {
  assert.equal(
    isXRobotsTagNoindexForUserAgent(
      "max-snippet:160, noindex",
      "OAI-SearchBot",
    ),
    true,
  );
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
  assert.match(result.detail, /indexable homepage/);
  assert.match(result.detail, /OAI-SearchBot/);
});

test("reports Unavailable when the public homepage is explicitly noindex", async () => {
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

    return response(
      '<html><head><meta name="robots" content="index, noindex"></head></html>',
      200,
      "text/html",
    );
  };

  const result = await resolveWebsiteSeoStatus(fetcher);

  assert.equal(result.status, "Unavailable");
  assert.match(result.detail, /noindex/);
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
