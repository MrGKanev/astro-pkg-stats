import type { PackageStat } from "./types";

const NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search";
const NPM_DOWNLOADS_URL = "https://api.npmjs.org/downloads/point";
const SEARCH_PAGE_SIZE = 250;
const BULK_CHUNK_SIZE = 128;

interface NpmSearchResponse {
  objects: { package: { name: string } }[];
}

interface NpmDownloadsPoint {
  downloads: number;
}

/** All package names an npm user maintains, via the public registry search API. */
export async function listNpmPackagesByMaintainer(username: string): Promise<string[]> {
  const names = new Set<string>();
  let from = 0;

  while (true) {
    const url = `${NPM_SEARCH_URL}?text=${encodeURIComponent(
      `maintainer:${username}`
    )}&size=${SEARCH_PAGE_SIZE}&from=${from}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`npm search failed for maintainer "${username}": ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as NpmSearchResponse;
    for (const obj of data.objects ?? []) names.add(obj.package.name);
    if (!data.objects || data.objects.length < SEARCH_PAGE_SIZE) break;
    from += SEARCH_PAGE_SIZE;
  }

  return [...names];
}

/**
 * Downloads for one period across many packages, using npm's bulk endpoint
 * where possible. Scoped packages (`@scope/name`) aren't supported by the
 * bulk endpoint and are fetched individually.
 */
async function fetchNpmDownloadsForPeriod(
  period: "last-day" | "last-week" | "last-month",
  packages: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const unscoped = packages.filter((p) => !p.startsWith("@"));
  const scoped = packages.filter((p) => p.startsWith("@"));

  for (let i = 0; i < unscoped.length; i += BULK_CHUNK_SIZE) {
    const chunk = unscoped.slice(i, i + BULK_CHUNK_SIZE);
    const res = await fetch(`${NPM_DOWNLOADS_URL}/${period}/${chunk.join(",")}`);
    if (!res.ok) continue;
    const data = await res.json();
    if (chunk.length === 1) {
      const point = data as NpmDownloadsPoint | null;
      result[chunk[0]] = point?.downloads ?? 0;
    } else {
      const byName = data as Record<string, NpmDownloadsPoint | null>;
      for (const name of chunk) result[name] = byName[name]?.downloads ?? 0;
    }
  }

  await Promise.all(
    scoped.map(async (name) => {
      const res = await fetch(`${NPM_DOWNLOADS_URL}/${period}/${encodeURIComponent(name)}`);
      if (!res.ok) {
        result[name] = 0;
        return;
      }
      const data = (await res.json()) as NpmDownloadsPoint;
      result[name] = data?.downloads ?? 0;
    })
  );

  return result;
}

/** Fetch daily/weekly/monthly download counts for a list of npm package names. */
export async function fetchNpmStats(packages: string[]): Promise<PackageStat[]> {
  if (packages.length === 0) return [];

  const [daily, weekly, monthly] = await Promise.all([
    fetchNpmDownloadsForPeriod("last-day", packages),
    fetchNpmDownloadsForPeriod("last-week", packages),
    fetchNpmDownloadsForPeriod("last-month", packages),
  ]);

  return packages.map((name) => ({
    ecosystem: "npm" as const,
    name,
    url: `https://www.npmjs.com/package/${name}`,
    downloads: {
      daily: daily[name] ?? 0,
      weekly: weekly[name] ?? 0,
      monthly: monthly[name] ?? 0,
    },
  }));
}
