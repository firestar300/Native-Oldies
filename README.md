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
npm run preview
```

## Cover art

After editing `src/data/projects.js`, download missing Twitch/IGDB box art:

```bash
npm run covers
```

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
2. Run `npm run covers`.
3. Commit the data file and the new file under `src/assets/covers/`.
