/**
 * Fills release years in src/data/decomp-dev-metadata-cache.json (Wikipedia).
 * Twitch box art: npm run assign:decomp-twitch (or edit decomp-dev-twitch-cache.json)
 *
 * Usage: npm run enrich:decomp-dev
 */
import {
  DECOMP_DEV,
  DECOMP_DEV_EXCLUDED_PLATFORMS,
  isDecompDevExcludedRepo,
} from '../src/data/decomp-dev-source.js'
import { portProjects } from '../src/data/projects.js'
import {
  inferYearFromGameName,
  isDecompDevGame,
  loadMetadataCache,
  lookupDecompDevMetadata,
  saveMetadataCache,
} from './decomp-dev-metadata.mjs'

const normalizeRepo = (url) =>
  url?.replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase() ?? ''

const delayMs = Number.parseInt(process.env.DECOMP_ENRICH_DELAY_MS ?? '3500', 10)
const enrichLimit = Number.parseInt(process.env.DECOMP_ENRICH_LIMIT ?? '0', 10)

const response = await fetch(DECOMP_DEV.projectsFeedUrl, {
  headers: { 'User-Agent': 'native-oldies/1.0 (decomp.dev enrich)' },
})
if (!response.ok) throw new Error(`decomp.dev feed responded ${response.status}`)

const { projects: remoteProjects } = await response.json()
const existingRepos = new Set(
  portProjects.map((project) => normalizeRepo(project.repo)).filter(Boolean),
)

const cache = await loadMetadataCache()
let updated = 0
const SAVE_EVERY = 5

for (const remote of remoteProjects) {
  const repoUrl = remote.repo_url?.trim()
  if (!repoUrl || existingRepos.has(normalizeRepo(repoUrl))) continue
  const gameName = remote.name ?? `${remote.owner}/${remote.repo}`
  if (!isDecompDevGame(gameName, remote.repo)) {
    delete cache[`${remote.owner}/${remote.repo}`]
    continue
  }
  if (remote.platform && DECOMP_DEV_EXCLUDED_PLATFORMS.has(remote.platform)) {
    delete cache[`${remote.owner}/${remote.repo}`]
    continue
  }
  if (isDecompDevExcludedRepo(remote.owner, remote.repo)) {
    delete cache[`${remote.owner}/${remote.repo}`]
    continue
  }

  const key = `${remote.owner}/${remote.repo}`
  const current = cache[key] ?? {}
  if (current.year) continue
  if (enrichLimit > 0 && updated >= enrichLimit) break

  const meta = await lookupDecompDevMetadata(gameName, { shortName: remote.short_name })
  const year = meta.year ?? inferYearFromGameName(gameName)
  if (year) cache[key] = { year }
  updated += 1
  console.log(key, cache[key] ?? {})
  if (updated % SAVE_EVERY === 0) await saveMetadataCache(cache)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

await saveMetadataCache(cache)
console.log(`Updated ${updated} cache entries (${Object.keys(cache).length} total keys)`)
