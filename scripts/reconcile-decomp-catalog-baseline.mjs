/**
 * Restores decomp.dev catalogue metadata from a Git baseline (default: HEAD)
 * after sync overwrote platform/year/twitch fields in decomp-dev-projects.js.
 *
 * - Backfills src/data/decomp-dev-metadata-cache.json (platformLabel, year, gameTitle)
 * - Backfills src/data/decomp-dev-twitch-cache.json (twitchBoxArtId)
 * - Writes src/data/decomp-dev-preserved-projects.json (baseline rows missing from current feed)
 *
 * Usage: node scripts/reconcile-decomp-catalog-baseline.mjs
 *        DECOMP_BASELINE_REF=ad88a0e node scripts/reconcile-decomp-catalog-baseline.mjs
 */
import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isSlugGameTitle } from './decomp-dev-metadata.mjs'
import { getTwitchCacheEntry } from './decomp-dev-twitch-cache.mjs'
import { portProjects } from '../src/data/projects.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const METADATA_PATH = fileURLToPath(new URL('../src/data/decomp-dev-metadata-cache.json', import.meta.url))
const TWITCH_PATH = fileURLToPath(new URL('../src/data/decomp-dev-twitch-cache.json', import.meta.url))
const CURRENT_CATALOG_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-projects.js', import.meta.url),
)
const PRESERVED_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-preserved-projects.json', import.meta.url),
)

const BASELINE_REF = process.env.DECOMP_BASELINE_REF ?? 'HEAD'

const normalizeRepo = (url) =>
  url?.replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase() ?? ''

/** @param {string} src */
const extractDecompProjects = (src) => {
  const match = src.match(/export const decompDevProjects = (\[[\s\S]*\])\s*$/m)
  if (!match) throw new Error('Could not parse decompDevProjects array')
  return JSON.parse(match[1])
}

/** @param {string | null | undefined} repoUrl */
const ownerRepoFromUrl = (repoUrl) => {
  const normalized = repoUrl?.replace(/\.git$/i, '').replace(/\/$/, '')
  const m = normalized?.match(/github\.com\/([^/]+)\/([^/]+)$/i)
  if (!m) return null
  return `${m[1]}/${m[2]}`
}

/** @param {Record<string, unknown>} map */
/** @param {string} ownerRepo */
const resolveCacheKey = (map, ownerRepo) => {
  const lower = ownerRepo.toLowerCase()
  const hit = Object.keys(map).find((key) => key.toLowerCase() === lower)
  return hit ?? ownerRepo
}

const loadBaselineCatalog = () => {
  const src = execSync(`git show ${BASELINE_REF}:src/data/decomp-dev-projects.js`, {
    encoding: 'utf8',
    cwd: ROOT,
  })
  return extractDecompProjects(src)
}

const loadCurrentCatalog = async () => {
  const src = await readFile(CURRENT_CATALOG_PATH, 'utf8')
  return extractDecompProjects(src)
}

const baseline = loadBaselineCatalog()
const current = await loadCurrentCatalog()
const metadata = JSON.parse(await readFile(METADATA_PATH, 'utf8'))
const twitch = JSON.parse(await readFile(TWITCH_PATH, 'utf8'))

const portRepos = new Set(portProjects.map((p) => normalizeRepo(p.repo)).filter(Boolean))
const currentRepos = new Set(current.map((p) => normalizeRepo(p.repo)).filter(Boolean))

let metaPlatform = 0
let metaYear = 0
let metaGameTitle = 0
let metaGameTitleTwitch = 0
let twitchIds = 0

for (const project of baseline) {
  const ownerRepo = ownerRepoFromUrl(project.repo)
  if (!ownerRepo) continue

  const metaKey = resolveCacheKey(metadata, ownerRepo)
  const entry = { ...(metadata[metaKey] ?? {}) }

  if (project.platform && project.platform !== 'Unknown' && !entry.platformLabel) {
    entry.platformLabel = project.platform
    metaPlatform += 1
  }
  if (Number(project.year) > 0 && !entry.year) {
    entry.year = project.year
    metaYear += 1
  }

  const baselineGame = (project.game ?? '').trim()
  if (
    baselineGame &&
    !isSlugGameTitle(baselineGame, project.project) &&
    (!entry.gameTitle || isSlugGameTitle(entry.gameTitle, project.project))
  ) {
    entry.gameTitle = baselineGame
    metaGameTitle += 1
  }

  if (Object.keys(entry).length > 0) metadata[metaKey] = entry

  if (project.twitchBoxArtId) {
    const twitchKey = resolveCacheKey(twitch, ownerRepo)
    if (!twitch[twitchKey]?.twitchBoxArtId) {
      twitch[twitchKey] = {
        ...twitch[twitchKey],
        twitchBoxArtId: project.twitchBoxArtId,
        twitchName: twitch[twitchKey]?.twitchName ?? 'baseline',
      }
      twitchIds += 1
    }
  }
}

const preserved = baseline.filter((project) => {
  const repo = normalizeRepo(project.repo)
  if (!repo || portRepos.has(repo) || currentRepos.has(repo)) return false
  return true
})

for (const project of [...current, ...preserved]) {
  if (!isSlugGameTitle(project.game, project.project)) continue
  const ownerRepo = ownerRepoFromUrl(project.repo)
  if (!ownerRepo) continue
  const twitchEntry = getTwitchCacheEntry(twitch, ownerRepo)
  const twitchName = (twitchEntry?.twitchName ?? '').trim()
  if (!twitchName || twitchName === 'manual' || twitchName === 'baseline') continue
  const metaKey = resolveCacheKey(metadata, ownerRepo)
  const entry = { ...(metadata[metaKey] ?? {}) }
  if (!entry.gameTitle || isSlugGameTitle(entry.gameTitle, project.project)) {
    entry.gameTitle = twitchName
    metadata[metaKey] = entry
    metaGameTitleTwitch += 1
  }
}

const sortedMetadata = Object.fromEntries(
  Object.keys(metadata)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((key) => [key, metadata[key]]),
)

await writeFile(METADATA_PATH, `${JSON.stringify(sortedMetadata, null, 2)}\n`)
await writeFile(TWITCH_PATH, `${JSON.stringify(twitch, null, 2)}\n`)
await writeFile(PRESERVED_PATH, `${JSON.stringify(preserved, null, 2)}\n`)

console.log(
  `Baseline ${BASELINE_REF}: ${baseline.length} projects; backfilled metadata (platformLabel: ${metaPlatform}, year: ${metaYear}, gameTitle: ${metaGameTitle}, gameTitle from Twitch: ${metaGameTitleTwitch}), twitch ids: ${twitchIds}; preserved ${preserved.length} projects missing from current feed.`,
)
console.log('Next: DECOMP_DEV_SKIP_REPORTS=1 npm run sync:decomp-dev')
