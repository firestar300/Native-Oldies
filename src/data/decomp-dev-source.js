/**
 * decomp.dev — matching decompilation progress reports (C/C++ rebuilt to match originals).
 * @see https://decomp.dev/
 */

/** @typedef {'decomp.dev'} DecompDevCatalogSource */

export const DECOMP_DEV = {
  name: 'decomp.dev',
  catalogUrl: 'https://decomp.dev/',
  projectsFeedUrl: 'https://decomp.dev/projects.json',
  description:
    'Community directory of matching decompilation projects with live progress metrics (matched code, linked units).',
}

/** @param {string} owner GitHub org or user */
/** @param {string} repo GitHub repository name */
export const decompDevProjectUrl = (owner, repo) => `https://decomp.dev/${owner}/${repo}`

/** decomp.dev platform slug → catalogue filter label */
export const DECOMP_DEV_PLATFORM_LABELS = {
  '3ds': 'Nintendo 3DS',
  gba: 'Game Boy Advance',
  gc: 'GameCube',
  n64: 'Nintendo 64',
  nds: 'Nintendo DS',
  ps: 'PlayStation',
  ps2: 'PlayStation 2',
  psp: 'PlayStation Portable',
  switch: 'Switch',
  wii: 'Wii',
  wiiu: 'Wii U',
  win32: 'Windows',
  xbox: 'Xbox',
  xbox360: 'Xbox 360',
}

/** decomp.dev platform slugs excluded from the catalogue (not classic console/handheld originals). */
export const DECOMP_DEV_EXCLUDED_PLATFORMS = new Set(['win32'])

/** GitHub `owner/repo` keys excluded from imports (lowercase). */
export const DECOMP_DEV_EXCLUDED_REPOS = new Set(['alebello7276/xkrnl-decomp'])

/** @param {string} owner */
/** @param {string} repo */
export const isDecompDevExcludedRepo = (owner, repo) =>
  DECOMP_DEV_EXCLUDED_REPOS.has(`${owner}/${repo}`.toLowerCase())
