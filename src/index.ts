export { default as PackageStats } from "./components/PackageStats.astro";

export { getPackageStats } from "./lib/stats";
export { listNpmPackagesByMaintainer, fetchNpmStats } from "./lib/npm";
export { listPackagistPackagesByVendor, fetchPackagistStats } from "./lib/packagist";
export { readCache, writeCache, clearCache, DEFAULT_CACHE_DIR, DEFAULT_CACHE_TTL } from "./lib/cache";

export type {
  Ecosystem,
  DownloadCounts,
  PackageStat,
  PackageStatsTotals,
  PackageStatsSummary,
  NpmSourceOptions,
  PackagistSourceOptions,
  PackageStatsOptions,
} from "./lib/types";
export type { CacheOptions } from "./lib/cache";
