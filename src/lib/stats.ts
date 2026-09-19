import { readCache, writeCache } from "./cache";
import { fetchNpmStats, listNpmPackagesByMaintainer } from "./npm";
import { fetchPackagistStats, listPackagistPackagesByVendor } from "./packagist";
import type {
  NpmSourceOptions,
  PackagistSourceOptions,
  PackageStatsOptions,
  PackageStatsSummary,
} from "./types";

/** Accept a single value or an array of values and always return an array. */
function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cacheKeyFor(options: PackageStatsOptions): string {
  return JSON.stringify({
    npmUsernames: toArray(options.npm?.username).slice().sort(),
    npmPackages: [...(options.npm?.packages ?? [])].sort(),
    packagistVendors: toArray(options.packagist?.vendor).slice().sort(),
    packagistPackages: [...(options.packagist?.packages ?? [])].sort(),
  });
}

async function resolveNpmPackages(opts?: NpmSourceOptions): Promise<string[]> {
  if (!opts) return [];
  const names = new Set(opts.packages ?? []);
  const usernames = toArray(opts.username);
  const results = await Promise.all(usernames.map((username) => listNpmPackagesByMaintainer(username)));
  for (const list of results) for (const name of list) names.add(name);
  return [...names];
}

async function resolvePackagistPackages(opts?: PackagistSourceOptions): Promise<string[]> {
  if (!opts) return [];
  const names = new Set(opts.packages ?? []);
  const vendors = toArray(opts.vendor);
  const results = await Promise.all(vendors.map((vendor) => listPackagistPackagesByVendor(vendor)));
  for (const list of results) for (const name of list) names.add(name);
  return [...names];
}

/**
 * Resolve package lists (by username/vendor and/or explicit names) and fetch
 * download stats for npm and Packagist in parallel, merged and sorted by
 * monthly downloads descending.
 *
 * Results are cached to disk for an hour by default (see `options.cache`),
 * so repeated builds/dev-server reloads don't re-hit npm/Packagist every time.
 */
export async function getPackageStats(options: PackageStatsOptions): Promise<PackageStatsSummary> {
  const cacheOptions = options.cache === false ? { disabled: true } : options.cache ?? {};
  const cacheKey = cacheKeyFor(options);

  const cached = readCache<PackageStatsSummary>(cacheKey, cacheOptions);
  if (cached) return cached;

  const [npmPackages, packagistPackages] = await Promise.all([
    resolveNpmPackages(options.npm),
    resolvePackagistPackages(options.packagist),
  ]);

  const [npmStats, packagistStats] = await Promise.all([
    npmPackages.length ? fetchNpmStats(npmPackages) : Promise.resolve([]),
    packagistPackages.length ? fetchPackagistStats(packagistPackages) : Promise.resolve([]),
  ]);

  const packages = [...npmStats, ...packagistStats].sort(
    (a, b) => (b.downloads.monthly ?? 0) - (a.downloads.monthly ?? 0)
  );

  const totals = packages.reduce(
    (acc, p) => {
      acc.daily += p.downloads.daily ?? 0;
      acc.weekly += p.downloads.weekly ?? 0;
      acc.monthly += p.downloads.monthly ?? 0;
      acc.total += p.downloads.total ?? 0;
      return acc;
    },
    { daily: 0, weekly: 0, monthly: 0, total: 0, packageCount: packages.length }
  );

  const summary = { packages, totals };
  writeCache(cacheKey, summary, cacheOptions);
  return summary;
}
