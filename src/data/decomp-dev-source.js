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

/**
 * Archived decomp.dev UI + project index (Wayback-style mirror).
 * @see https://labs.parkrelics.com/decomp.dev/projects
 */
export const DECOMP_DEV_MIRROR = {
  baseUrl: 'https://labs.parkrelics.com/decomp.dev',
  projectsApiUrl: 'https://labs.parkrelics.com/decomp.dev/api/projects',
}

/** @param {string} owner GitHub org or user */
/** @param {string} repo GitHub repository name */
export const decompDevProjectUrl = (owner, repo) => `https://decomp.dev/${owner}/${repo}`

/** @param {string} owner */
/** @param {string} repo */
export const decompDevMirrorProjectUrl = (owner, repo) =>
  `${DECOMP_DEV_MIRROR.baseUrl}/${owner}/${repo}`

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
export const DECOMP_DEV_EXCLUDED_REPOS = new Set([
  'alebello7276/xkrnl-decomp',
  '3dwcommunity/3dcomp',
  't3chnolog1c/bigred',
  'reyfxck/snesstation-decomp',
  'jeanxpereira/crystalosd',
  'guestdreemurr/forecast',
  'sozud/psy-q-decomp',
  'rootcubed/mpls_movie-decomp',
  /** Same repo name as ReGame-Labs/dcb_decomp; GBA Battle Spirit duplicate on decomp.dev. */
  'juandav/dcb_decomp',
])

/** @param {string} owner */
/** @param {string} repo */
export const isDecompDevExcludedRepo = (owner, repo) =>
  DECOMP_DEV_EXCLUDED_REPOS.has(`${owner}/${repo}`.toLowerCase())

/**
 * decomp.dev mirror `firstArchived` / `lastArchived` (YYYYMMDDHHmmss) → ISO calendar date (YYYY-MM-DD).
 * @param {string | null | undefined} archivedAt
 * @returns {string | undefined}
 */
export const parseDecompCatalogPublishedAt = (archivedAt) => {
  if (!archivedAt || typeof archivedAt !== 'string' || archivedAt.length < 8) return undefined
  const year = archivedAt.slice(0, 4)
  const month = archivedAt.slice(4, 6)
  const day = archivedAt.slice(6, 8)
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return undefined
  return `${year}-${month}-${day}`
}
