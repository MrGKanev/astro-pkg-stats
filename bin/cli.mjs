#!/usr/bin/env node
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_CACHE_DIR = join(process.cwd(), "node_modules", ".cache", "astro-pkg-stats");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function clearCache(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`Cleared astro-pkg-stats cache: ${dir}`);
  } else {
    console.log(`Cache already empty: ${dir}`);
  }
}

function printHelp() {
  console.log(`astro-pkg-stats <command> [options]

Commands:
  clear      Delete the on-disk stats cache
  refresh    Alias for "clear" - forces the next build/dev run to fetch fresh stats

Options:
  --dir <path>   Cache directory (default: node_modules/.cache/astro-pkg-stats)
`);
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const dir = typeof args.dir === "string" ? args.dir : DEFAULT_CACHE_DIR;

switch (command) {
  case "clear":
  case "refresh":
    clearCache(dir);
    break;
  case undefined:
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exitCode = 1;
}
