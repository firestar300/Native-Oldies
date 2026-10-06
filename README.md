# Native Oldies

Unofficial directory of fan-made **native PC ports** of classic console games (decompilations, static recompilations, reimplementations). No ROMs or game binaries are hosted here.

## Local development

```bash
npm ci
npm run dev
```

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

1. Append an entry in `src/data/projects.js` (set `twitchBoxArtId` from the `_IGDB` segment in a Twitch category box art URL).
2. Run `npm run covers` and check that the cover matches the game.
3. Commit the data file and the new file under `src/assets/covers/`. Port count, sitemap, JSON-LD and the no-JS list update automatically at build time.
