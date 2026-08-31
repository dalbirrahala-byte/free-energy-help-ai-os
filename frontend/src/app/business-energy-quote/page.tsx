import { permanentRedirect } from "next/navigation";

type LegacyPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LegacyBusinessEnergyQuotePage({ searchParams }: LegacyPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString();
  permanentRedirect(`/free-business-energy-health-check${suffix ? `?${suffix}` : ""}`);
}
