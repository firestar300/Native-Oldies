# Native Oldies

Unofficial directory of fan-made **native PC ports** of classic console games (decompilations, static recompilations, reimplementations). No ROMs or game binaries are hosted here.

## Local development

```bash
npm ci
npm run dev
```

After `git pull` or `npm run sync:decomp-dev`, restart the dev server so the catalogue reloads (several Vite instances may be bound to ports 5173, 5174, … if old servers were left running). Do not run `npm run covers -- --force` while `npm run dev` is up — it rewrites many files and can make the page reload continuously; stop covers first, or refresh once after covers finish. The live site at [Native Oldies on GitHub Pages](https://firestar300.github.io/Native-Oldies/) is built from `main`; local `npm run dev` should show the same project count as the **ports** stat on that page.

On **localhost** (or `npm run dev` only), extra catalogue tools appear under **Show filters → Dev**: chips to list only projects without a cover file or without a release year, and sort modes that float incomplete rows to the top. These controls are omitted on GitHub Pages (`import.meta.env.DEV` is false and the hostname is not localhost).

Build for production (root base path, e.g. local preview):

```bash
npm run build
npm run preview
```

To mimic GitHub Pages locally:

```bash
BASE_PATH=/Native-Oldies/ npm run build
BASE_PATH=/Native-Oldies/ npm run preview
```

## Cover art

After editing `src/data/projects.js`, download missing Twitch/IGDB box art:

```bash
npm run covers
```

Covers are resized to 480×640 and saved as WebP in `src/assets/covers/` (about 30–70 KB each). Use `npm run covers -- --force` to regenerate all of them.

## SEO, performance and accessibility

- **Head and structured data** are generated at build time by `scripts/vite-plugin-seo.js`: canonical URL, Open Graph and Twitter tags, JSON-LD (`WebSite`, `CollectionPage` with an `ItemList` of every port, `FAQPage`), `robots.txt` and `sitemap.xml`.
- **FAQ** content lives in `src/data/faq.js` and feeds both the visible section and the JSON-LD, so they never drift apart.
- **`<noscript>`** fallback lists every port as plain HTML for crawlers and no-JS visitors.
- **Social image** is `public/og-image.png` (1200×630). Regenerate it if the branding changes.
- **Absolute URL**: set `SITE_URL` when building for another domain (the deploy workflow derives it from the repository):

  ```bash
  SITE_URL=https://example.com/ npm run build
  ```

- Lighthouse (desktop and mobile) scores 100 for Accessibility, Best Practices and SEO, with no layout shift. Keep covers sized (`width`/`height`), keep text contrast at WCAG AA in both themes, and re-run an audit after UI changes.

## Deploy on GitHub Pages

This repo ships a [GitHub Actions workflow](.github/workflows/deploy.yml) that builds with Vite and publishes the `dist` folder to Pages.

1. Push the `main` branch to GitHub (`origin` is already configured for this project).
2. In the repository on GitHub: **Settings → Pages → Build and deployment → Source** → choose **GitHub Actions**.
3. On each push to `main`, the **Deploy to GitHub Pages** workflow runs automatically. You can also trigger it manually from the **Actions** tab.

The live URL follows the default project Pages pattern:

`https://<owner>.github.io/<repository-name>/`

For example: `https://firestar300.github.io/Native-Oldies/`

## Adding a project

1. Append an entry in `src/data/projects.js` inside `portProjects` (set `twitchBoxArtId` from the `_IGDB` segment in a Twitch category box art URL).
2. Run `npm run covers` and check that the cover matches the game.
3. Commit the data file and the new file under `src/assets/covers/`. Port count, sitemap, JSON-LD and the no-JS list update automatically at build time.

## decomp.dev catalogue

Matching decompilation projects are also imported from [decomp.dev](https://decomp.dev/) (`src/data/decomp-dev-source.js`). Regenerate the auto-imported list after the upstream feed changes:

```bash
npm run enrich:decomp-dev     # Wikipedia release years (optional, slow)
npm run assign:decomp-twitch  # Twitch box art ids, 50 games per run (no Twitch app)
npm run sync:decomp-dev
npm run covers
```

Covers use the same Twitch CDN ids as curated ports (`twitchBoxArtId`). No Twitch developer app: run `assign:decomp-twitch` (50 games per batch) to match titles against a public directory list, or set ids manually in `src/data/decomp-dev-twitch-cache.json` (`owner/repo` → `{ "twitchBoxArtId": … }`, id from the Twitch directory box art URL). Optional title overrides: `src/data/decomp-dev-twitch-aliases.json` (`owner/repo` → exact Twitch category name). Confirmed ids: `src/data/decomp-dev-twitch-manual.json` (`owner/repo` → numeric id). Twitch category titles in `src/data/decomp-dev-twitch-ignore-categories.json` are skipped during auto-match (e.g. generic Pokémon listings that steal fuzzy matches). Each `assign:decomp-twitch` run advances **50 rows** through the full decomp catalogue (stable order).

Caches: `src/data/decomp-dev-metadata-cache.json` (years), `src/data/decomp-dev-twitch-cache.json` (Twitch ids).

This writes `src/data/decomp-dev-projects.js` and merges it with `portProjects` and any rows in `src/data/decomp-dev-extra-projects.js` (manual decomps when a repo is not on decomp.dev). Non-game rows (emulators, SDKs, expansion kits, system software) and **Windows originals** (`win32` on decomp.dev) are skipped. Imported rows use `catalogSource: 'decomp.dev'`, link to their progress report, and stay `wip` until a native PC port is curated manually in `portProjects`.
