import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CacheOptions {
  /** Skip the cache entirely (always fetch fresh, never write). Default: false. */
  disabled?: boolean;
  /** How long a cached entry stays valid, in milliseconds. Default: 1 hour. */
  ttl?: number;
  /** Directory cache files are stored in. Default: node_modules/.cache/astro-pkg-stats */
  dir?: string;
}

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export const DEFAULT_CACHE_TTL = 60 * 60 * 1000;
export const DEFAULT_CACHE_DIR = join(process.cwd(), "node_modules", ".cache", "astro-pkg-stats");

function cacheFilePath(dir: string, key: string): string {
  const safeKey = key.replace(/[^a-z0-9_-]/gi, "_").slice(0, 200);
  return join(dir, `${safeKey}.json`);
}

export function readCache<T>(key: string, options: CacheOptions = {}): T | null {
  if (options.disabled) return null;
  const dir = options.dir ?? DEFAULT_CACHE_DIR;
  const ttl = options.ttl ?? DEFAULT_CACHE_TTL;
  const file = cacheFilePath(dir, key);

  if (!existsSync(file)) return null;
  try {
    const entry = JSON.parse(readFileSync(file, "utf-8")) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > ttl) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  if (options.disabled) return;
  const dir = options.dir ?? DEFAULT_CACHE_DIR;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(cacheFilePath(dir, key), JSON.stringify({ timestamp: Date.now(), data }), "utf-8");
  } catch {
    // Best-effort: a read-only filesystem (or similar) shouldn't break the build.
  }
}

/** Delete all cached entries in a cache directory (default: the shared default dir). */
export function clearCache(dir: string = DEFAULT_CACHE_DIR): void {
  rmSync(dir, { recursive: true, force: true });
}
