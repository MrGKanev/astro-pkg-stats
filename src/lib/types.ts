export type Ecosystem = "npm" | "packagist";

export interface DownloadCounts {
  daily?: number;
  weekly?: number;
  monthly: number;
  total?: number;
}

export interface PackageStat {
  ecosystem: Ecosystem;
  name: string;
  description?: string;
  url: string;
  downloads: DownloadCounts;
}

export interface PackageStatsTotals {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
  packageCount: number;
}

export interface PackageStatsSummary {
  packages: PackageStat[];
  totals: PackageStatsTotals;
}

export interface NpmSourceOptions {
  /** npm username(s) whose maintained packages should be included */
  username?: string | string[];
  /** Extra package names to include (or use instead of `username`) */
  packages?: string[];
}

export interface PackagistSourceOptions {
  /** Packagist vendor(s) (e.g. "laravel") whose packages should be included */
  vendor?: string | string[];
  /** Extra "vendor/package" names to include (or use instead of `vendor`) */
  packages?: string[];
}

export interface PackageStatsOptions {
  npm?: NpmSourceOptions;
  packagist?: PackagistSourceOptions;
  /**
   * Cache fetched stats to disk between builds/requests. Pass `false` to
   * disable caching, or an options object to tune the TTL/location.
   * Default: cached for 1 hour under `node_modules/.cache/astro-pkg-stats`.
   */
  cache?: import("./cache").CacheOptions | false;
}
