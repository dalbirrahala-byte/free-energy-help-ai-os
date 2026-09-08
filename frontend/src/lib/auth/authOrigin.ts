const DEFAULT_AUTH_ORIGIN = "https://free-energy-help-ai-os.vercel.app";

export function getCanonicalAuthOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_AUTH_ORIGIN?.trim();

  if (!configured) {
    return DEFAULT_AUTH_ORIGIN;
  }

  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_AUTH_ORIGIN;
  }
}

export function isCanonicalAuthOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === getCanonicalAuthOrigin();
  } catch {
    return false;
  }
}

export function canonicalAuthUrl(path: string): string {
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return new URL(safePath, getCanonicalAuthOrigin()).toString();
}
