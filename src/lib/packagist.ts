import type { PackageStat } from "./types";

const PACKAGIST_BASE = "https://packagist.org";

interface PackagistVendorListResponse {
  packageNames: string[];
}

interface PackagistPackageResponse {
  package?: {
    description?: string;
    downloads?: { total?: number; monthly?: number; daily?: number };
  };
}

/** All "vendor/package" names published by a Packagist vendor. */
export async function listPackagistPackagesByVendor(vendor: string): Promise<string[]> {
  const res = await fetch(`${PACKAGIST_BASE}/packages/list.json?vendor=${encodeURIComponent(vendor)}`);
  if (!res.ok) {
    throw new Error(`Packagist vendor lookup failed for "${vendor}": ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as PackagistVendorListResponse;
  return data.packageNames ?? [];
}

/** Fetch daily/monthly/total download counts for a list of "vendor/package" names. */
export async function fetchPackagistStats(packages: string[]): Promise<PackageStat[]> {
  const results = await Promise.all(
    packages.map(async (fullName): Promise<PackageStat | null> => {
      const res = await fetch(`${PACKAGIST_BASE}/packages/${fullName}.json`);
      if (!res.ok) return null;
      const data = (await res.json()) as PackagistPackageResponse;
      const pkg = data.package;
      if (!pkg) return null;
      const downloads = pkg.downloads ?? {};
      return {
        ecosystem: "packagist" as const,
        name: fullName,
        description: pkg.description,
        url: `${PACKAGIST_BASE}/packages/${fullName}`,
        downloads: {
          daily: downloads.daily ?? 0,
          monthly: downloads.monthly ?? 0,
          total: downloads.total ?? 0,
        },
      };
    })
  );

  return results.filter((r): r is PackageStat => r !== null);
}
