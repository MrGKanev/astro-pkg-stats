# astro-pkg-stats

An Astro component (plus plain TypeScript helpers) that shows download
statistics for packages you publish — on **npm** and on **Packagist** (the
PHP/Composer registry Laravel packages use).

Give it your npm username and/or Packagist vendor name and it automatically
finds every package you publish, fetches download counts, and renders a
ready-made stats widget. No API keys, no manual package lists required
(though you can add one if you want).

## Features

- **Two ecosystems, one widget** — npm and Packagist stats side by side,
  merged into one ranked table.
- **Multiple accounts supported** — track more than one npm username and/or
  more than one Packagist vendor at once (see [Multiple accounts](#multiple-accounts-and-vendors)).
- **Auto-discovery** — pass a username/vendor and every package under it is
  found automatically; you never have to keep a package list up to date by
  hand.
- **No API keys** — both npm's and Packagist's public stats endpoints are
  open and free to use.
- **Works with any rendering mode** — data is fetched server-side in the
  component's frontmatter, so it works with static builds, SSR, and hybrid
  rendering alike.
- **Cached to disk** — repeated builds and `astro dev` reloads reuse the same
  data for an hour by default instead of re-fetching every time (see
  [Caching](#caching)).
- **Light/dark aware** — the component's built-in styles follow
  `prefers-color-scheme` and a `data-theme` toggle automatically.
- **Astro 4–7 supported.**

## Install

```sh
npm install astro-pkg-stats
```

## Quick start

```astro
---
import { PackageStats } from "astro-pkg-stats";
---

<PackageStats
  title="My downloads"
  npm={{ username: "your-npm-username" }}
  packagist={{ vendor: "your-packagist-vendor" }}
/>
```

You can use either source alone — drop `npm` or `packagist` entirely if you
don't publish there.

## Props

| Prop        | Type                                                        | Description                                                    |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `title`     | `string`                                                      | Heading text. Default: `"Package downloads"`.                  |
| `class`     | `string`                                                      | Extra class(es) on the root `<section>`.                       |
| `npm`       | `{ username?: string \| string[]; packages?: string[] }`     | npm account(s) and/or explicit package names to include.       |
| `packagist` | `{ vendor?: string \| string[]; packages?: string[] }`       | Packagist vendor(s) and/or explicit `vendor/package` names.     |
| `cache`     | `false \| { ttl?: number; dir?: string }`                     | Cache tuning — see [Caching](#caching).                         |

## Multiple accounts and vendors

`username` and `vendor` each accept **either a single string or an array of
strings**. This is for people who publish under more than one npm account
(a personal account plus an org/team account, say) or more than one
Packagist vendor namespace — everything gets merged into a single, deduped,
ranked table:

```astro
<PackageStats
  title="My downloads"
  npm={{ username: ["your-personal-npm-username", "your-org-npm-username"] }}
  packagist={{ vendor: ["your-personal-vendor", "your-company-vendor"] }}
/>
```

All usernames/vendors are looked up in parallel, so adding more of them
doesn't meaningfully slow down the fetch. Duplicate package names (e.g. if
the same package somehow turns up under two lookups) are only counted once.

## Explicit package lists

You can also list exact package names, in addition to or instead of a
username/vendor — useful for including someone else's package you care
about, or a package that isn't under your main account/vendor namespace:

```astro
<PackageStats
  npm={{
    username: "your-npm-username",
    packages: ["some-other-persons-package"],
  }}
  packagist={{
    packages: ["vendor/a-package-not-under-your-vendor"],
  }}
/>
```

`packages` works fine on its own too, with no `username`/`vendor` at all, if
you'd rather curate the exact list yourself.

## Using the data yourself

Everything the component uses is also exported directly, if you want to
build your own UI or use the numbers outside of Astro templates:

```ts
import { getPackageStats } from "astro-pkg-stats";

const { packages, totals } = await getPackageStats({
  npm: { username: ["your-npm-username", "your-org-username"] },
  packagist: { vendor: "your-packagist-vendor" },
});

// packages: PackageStat[] — one entry per package, sorted by monthly downloads desc
// totals: { daily, weekly, monthly, total, packageCount }
```

Lower-level helpers are also available if you need finer control:

| Function                          | Purpose                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `listNpmPackagesByMaintainer(username)` | List package names maintained by one npm user.              |
| `fetchNpmStats(packageNames)`      | Fetch daily/weekly/monthly downloads for a list of npm packages. |
| `listPackagistPackagesByVendor(vendor)` | List `vendor/package` names published by one Packagist vendor. |
| `fetchPackagistStats(fullNames)`  | Fetch daily/monthly/total downloads for a list of Packagist packages. |

## Caching

Every call to `getPackageStats` (and so every render of `<PackageStats>`) is
cached to a JSON file under `node_modules/.cache/astro-pkg-stats/`, keyed by
the npm usernames, Packagist vendors, and explicit package lists you passed
in. By default an entry is reused for **1 hour**, which means:

- `astro dev` reloads reuse the same data instead of re-fetching on every save.
- Rebuilding a static site repeatedly (e.g. in CI, or locally) only hits
  npm/Packagist once per hour, even across multiple usernames/vendors.

Tune or disable it per-component via the `cache` prop (or per-call via
`getPackageStats({ ..., cache })`):

```astro
<!-- cache for 6 hours instead of the 1 hour default -->
<PackageStats npm={{ username: "you" }} cache={{ ttl: 6 * 60 * 60 * 1000 }} />

<!-- use a custom cache directory -->
<PackageStats npm={{ username: "you" }} cache={{ dir: "./.cache/pkg-stats" }} />

<!-- always fetch fresh, never read/write the cache -->
<PackageStats npm={{ username: "you" }} cache={false} />
```

`ttl` is in milliseconds; `dir` defaults to
`node_modules/.cache/astro-pkg-stats` (relative to `process.cwd()`).

### Forcing a refresh

The cache lives in `node_modules`, so a clean `npm install`/`npm ci` already
clears it. To force fresh data without reinstalling, use the bundled CLI:

```sh
npx astro-pkg-stats clear
# or, equivalently:
npx astro-pkg-stats refresh
```

Run it, then re-run `astro dev`/`astro build` — the next fetch will hit
npm/Packagist again and repopulate the cache. Add `--dir <path>` if you
customized the cache directory via the `cache.dir` option:

```sh
npx astro-pkg-stats clear --dir ./.cache/pkg-stats
```

You can also wire it into your own scripts, e.g. in `package.json`:

```json
{
  "scripts": {
    "stats:refresh": "astro-pkg-stats clear && astro build"
  }
}
```

## How it works

- **npm**: package names come from the registry search API
  (`registry.npmjs.org/-/v1/search?text=maintainer:<username>`, one request
  per username); download counts come from
  `api.npmjs.org/downloads/point/<period>/...`, batched in requests of up to
  128 packages at a time (scoped `@scope/name` packages are fetched
  individually, since npm's bulk endpoint doesn't support them).
- **Packagist**: package names come from
  `packagist.org/packages/list.json?vendor=<vendor>` (one request per
  vendor); download counts (daily/monthly/total) come from
  `packagist.org/packages/<vendor>/<package>.json`, one request per package.
- Results from every source are merged into a single list, sorted by monthly
  downloads descending, with totals summed across everything.
- A failed fetch (bad username, network error, etc.) is caught and shown as
  an inline error message in the component rather than breaking the whole
  page build.

## Example project

See `example/` for a minimal Astro site using the component. To try it
locally:

```sh
npm install          # install this package's own dependencies
cd example
npm install           # installs astro-pkg-stats from the parent folder via file:..
npm run build          # or `npm run dev`
```

Edit `example/src/pages/index.astro` to point at your own npm/Packagist
account(s).

## License

MIT
