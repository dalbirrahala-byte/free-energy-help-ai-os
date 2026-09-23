import type { ServiceStatusInfo } from "./types";

const DEFAULT_PUBLIC_SITE_ORIGIN = "https://www.freeenergyhelp.co.uk";
const SEO_CHECK_TIMEOUT_MS = 5000;
const OAI_SEARCH_BOT = "oai-searchbot";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type RobotsGroup = {
  agents: string[];
  rules: Array<{ directive: "allow" | "disallow"; path: string }>;
};

function normaliseOrigin(raw: string | undefined): string {
  const candidate = raw?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_PUBLIC_SITE_ORIGIN;
    }

    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }
}

async function fetchWithTimeout(
  fetcher: FetchLike,
  url: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEO_CHECK_TIMEOUT_MS);

  try {
    return await fetcher(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "FreeEnergyHelp-SEO-Health/1.0",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobotsGroups(robotsText: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let agents: string[] = [];
  let rules: RobotsGroup["rules"] = [];
  let hasRules = false;

  const flush = () => {
    if (agents.length > 0) {
      groups.push({ agents, rules });
    }

    agents = [];
    rules = [];
    hasRules = false;
  };

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim() ?? "";

    if (!line) {
      if (hasRules) {
        flush();
      }
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === "user-agent") {
      if (hasRules) {
        flush();
      }

      agents.push(value.toLowerCase());
      continue;
    }

    if (
      agents.length > 0 &&
      (directive === "allow" || directive === "disallow")
    ) {
      hasRules = true;
      rules.push({
        directive,
        path: value,
      });
    }
  }

  if (agents.length > 0) {
    flush();
  }

  return groups;
}

function readHtmlAttribute(tag: string, attribute: string): string | null {
  const quoted = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']*)["']`, "i"),
  );

  if (quoted) {
    return quoted[1]?.trim() ?? "";
  }

  const unquoted = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*([^\\s>]+)`, "i"),
  );

  return unquoted?.[1]?.trim() ?? null;
}

function containsNoindexDirective(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return value
    .toLowerCase()
    .split(/[,\s]+/)
    .some((directive) => directive === "noindex");
}

export function isHomepageIndexingBlocked(
  homepageResponse: Response,
  homepageHtml: string,
): boolean {
  if (containsNoindexDirective(homepageResponse.headers.get("x-robots-tag"))) {
    return true;
  }

  for (const match of homepageHtml.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = readHtmlAttribute(tag, "name");

    if (
      name?.toLowerCase() === "robots" &&
      containsNoindexDirective(readHtmlAttribute(tag, "content"))
    ) {
      return true;
    }
  }

  return false;
}

export function isUserAgentFullyBlocked(
  robotsText: string,
  userAgent: string,
): boolean {
  const groups = parseRobotsGroups(robotsText);
  const target = userAgent.toLowerCase();
  const exactGroups = groups.filter((group) => group.agents.includes(target));
  const matchingGroups =
    exactGroups.length > 0
      ? exactGroups
      : groups.filter((group) => group.agents.includes("*"));

  if (matchingGroups.length === 0) {
    return false;
  }

  return matchingGroups.some((group) => {
    const blocksRoot = group.rules.some(
      (rule) => rule.directive === "disallow" && rule.path === "/",
    );
    const explicitlyAllowsRoot = group.rules.some(
      (rule) => rule.directive === "allow" && rule.path === "/",
    );

    return blocksRoot && !explicitlyAllowsRoot;
  });
}

function notConfigured(detail: string): ServiceStatusInfo {
  return {
    id: "seo",
    name: "Website SEO + AI Search",
    status: "Not configured",
    detail,
  };
}

function unavailable(detail: string): ServiceStatusInfo {
  return {
    id: "seo",
    name: "Website SEO + AI Search",
    status: "Unavailable",
    detail,
  };
}

export async function resolveWebsiteSeoStatus(
  fetcher: FetchLike = fetch,
  configuredOrigin = process.env.FEH_PUBLIC_SITE_URL,
): Promise<ServiceStatusInfo> {
  const origin = normaliseOrigin(configuredOrigin);
  const homepageUrl = `${origin}/`;
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;

  try {
    const [homepageResponse, robotsResponse, sitemapResponse] =
      await Promise.all([
        fetchWithTimeout(fetcher, homepageUrl),
        fetchWithTimeout(fetcher, robotsUrl),
        fetchWithTimeout(fetcher, sitemapUrl),
      ]);

    if (!homepageResponse.ok) {
      return unavailable(
        `Public homepage returned HTTP ${homepageResponse.status}.`,
      );
    }

    if (robotsResponse.status === 404) {
      return notConfigured("robots.txt was not found on the public site.");
    }

    if (!robotsResponse.ok) {
      return unavailable(
        `robots.txt returned HTTP ${robotsResponse.status}.`,
      );
    }

    if (sitemapResponse.status === 404) {
      return notConfigured("sitemap.xml was not found on the public site.");
    }

    if (!sitemapResponse.ok) {
      return unavailable(
        `sitemap.xml returned HTTP ${sitemapResponse.status}.`,
      );
    }

    const [homepageHtml, robotsText, sitemapText] = await Promise.all([
      homepageResponse.text(),
      robotsResponse.text(),
      sitemapResponse.text(),
    ]);

    if (isHomepageIndexingBlocked(homepageResponse, homepageHtml)) {
      return unavailable(
        "Public homepage is explicitly marked noindex and cannot be treated as search-ready.",
      );
    }

    if (!/user-agent\s*:/i.test(robotsText)) {
      return notConfigured(
        "robots.txt is reachable but does not contain recognisable crawler rules.",
      );
    }

    if (!/<(?:urlset|sitemapindex)\b/i.test(sitemapText)) {
      return notConfigured(
        "sitemap.xml is reachable but does not look like an XML sitemap.",
      );
    }

    if (isUserAgentFullyBlocked(robotsText, OAI_SEARCH_BOT)) {
      return unavailable(
        "OAI-SearchBot is blocked from the whole public site by robots.txt.",
      );
    }

    return {
      id: "seo",
      name: "Website SEO + AI Search",
      status: "Connected",
      detail:
        "Verified indexable homepage, robots.txt and sitemap.xml; OAI-SearchBot is not fully blocked.",
    };
  } catch {
    return unavailable(
      "Could not complete the live public-site SEO and AI crawler checks.",
    );
  }
}
