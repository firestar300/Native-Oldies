/**
 * decomp.dev projects feed with mirror + local fallbacks when projects.json is retired (HTTP 410).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DECOMP_DEV, DECOMP_DEV_MIRROR } from '../src/data/decomp-dev-source.js'

const SNAPSHOT_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-projects-feed.snapshot.json', import.meta.url),
)
const GENERATED_CATALOG_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-projects.js', import.meta.url),
)

const FEED_HEADERS = { 'User-Agent': 'native-oldies/1.0 (decomp.dev feed)' }
const REPORT_CONCURRENCY = 8

/** @param {string | null | undefined} repoUrl */
export const parseGithubOwnerRepo = (repoUrl) => {
  const normalized = repoUrl?.replace(/\.git$/i, '').replace(/\/$/, '')
  const match = normalized?.match(/github\.com\/([^/]+)\/([^/]+)$/i)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

/** @param {unknown} body */
const extractProjectsArray = (body) => {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object' && Array.isArray(body.projects)) return body.projects
  return null
}

/** @param {Record<string, unknown>} item */
const normalizeMirrorListItem = (item) => {
  const owner = String(item.owner ?? '')
  const repo = String(item.repository ?? item.repo ?? '')
  if (!owner || !repo) return null
  return {
    owner,
    repo,
    repo_url: `https://github.com/${owner}/${repo}`,
    name: typeof item.name === 'string' ? item.name : `${owner}/${repo}`,
    platform: typeof item.platform === 'string' && item.platform ? item.platform : undefined,
    firstArchived:
      typeof item.firstArchived === 'string' && item.firstArchived ? item.firstArchived : undefined,
    lastArchived:
      typeof item.lastArchived === 'string' && item.lastArchived ? item.lastArchived : undefined,
  }
}

/** @param {string | undefined} summary */
const parseMeasuresFromSummary = (summary) => {
  const matched = summary?.match(/([\d.]+)% matched code/)
  const linked = summary?.match(/([\d.]+)% fully linked/)
  if (!matched) return undefined
  return {
    matched_code_percent: Number.parseFloat(matched[1]),
    complete_code_percent: linked ? Number.parseFloat(linked[1]) : undefined,
  }
}

/** @param {import('../src/data/projects.js').Project} entry */
const rehydrateRemoteFromProject = (entry) => {
  const parsed = parseGithubOwnerRepo(entry.repo)
  if (!parsed) return null
  return {
    repo_url: entry.repo,
    owner: parsed.owner,
    repo: parsed.repo,
    name: entry.game,
    measures: parseMeasuresFromSummary(entry.summary),
  }
}

/** @param {string} owner */
/** @param {string} repo */
const fetchProjectReport = async (owner, repo) => {
  const bases = [DECOMP_DEV.catalogUrl.replace(/\/$/, ''), DECOMP_DEV_MIRROR.baseUrl]
  for (const base of bases) {
    const url = `${base}/${owner}/${repo}.json`
    try {
      const response = await fetch(url, { headers: FEED_HEADERS })
      if (!response.ok) continue
      const report = await response.json()
      if (report?.error) continue
      return {
        owner: report.owner ?? owner,
        repo: report.repo ?? repo,
        repo_url: report.repo_url ?? `https://github.com/${owner}/${repo}`,
        name: report.name,
        short_name: report.short_name,
        platform: report.platform,
        measures: report.measures,
      }
    } catch {
      // try next base
    }
  }
  return null
}

/**
 * @param {Array<Record<string, unknown>>} projects
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
const enrichWithReports = async (projects) => {
  const results = [...projects]
  let index = 0

  const worker = async () => {
    while (index < projects.length) {
      const current = index
      index += 1
      const base = projects[current]
      const owner = String(base.owner ?? '')
      const repo = String(base.repo ?? '')
      if (!owner || !repo) continue
      const report = await fetchProjectReport(owner, repo)
      if (report) results[current] = { ...base, ...report }
    }
  }

  await Promise.all(Array.from({ length: REPORT_CONCURRENCY }, () => worker()))
  return results
}

const tryLiveFeed = async () => {
  const response = await fetch(DECOMP_DEV.projectsFeedUrl, { headers: FEED_HEADERS })
  if (!response.ok) return null
  const body = await response.json()
  const projects = extractProjectsArray(body)
  if (!projects) throw new Error('decomp.dev feed: expected a projects array')
  return projects
}

const tryMirrorFeed = async () => {
  const response = await fetch(DECOMP_DEV_MIRROR.projectsApiUrl, { headers: FEED_HEADERS })
  if (!response.ok) return null
  const body = await response.json()
  const list = extractProjectsArray(body)
  if (!list?.length) return null
  return list.map(normalizeMirrorListItem).filter(Boolean)
}

/**
 * @param {{ enrichMeasures?: boolean }} [options]
 * @returns {Promise<{ projects: object[], source: 'live' | 'mirror' | 'snapshot' | 'catalogue', status: number }>}
 */
export const loadDecompDevRemoteProjects = async ({ enrichMeasures = false } = {}) => {
  let status = 200

  const live = await tryLiveFeed()
  if (live) {
    await writeFile(SNAPSHOT_PATH, `${JSON.stringify(live, null, 2)}\n`)
    return { projects: live, source: 'live', status }
  }
  status = 410

  const mirrorList = await tryMirrorFeed()
  if (mirrorList) {
    const projects = enrichMeasures ? await enrichWithReports(mirrorList) : mirrorList
    console.warn(
      `decomp.dev projects.json unavailable; loaded ${projects.length} projects from ${DECOMP_DEV_MIRROR.projectsApiUrl}${enrichMeasures ? ' (with per-project reports)' : ''}.`,
    )
    await writeFile(SNAPSHOT_PATH, `${JSON.stringify(projects, null, 2)}\n`)
    return { projects, source: 'mirror', status }
  }

  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8')
    const projects = JSON.parse(raw)
    if (Array.isArray(projects) && projects.length > 0) {
      console.warn(`decomp.dev feed unavailable; using snapshot (${projects.length} projects).`)
      return { projects, source: 'snapshot', status }
    }
  } catch {
    // fall through
  }

  const { decompDevProjects } = await import(pathToFileURL(GENERATED_CATALOG_PATH).href)
  const projects = decompDevProjects.map(rehydrateRemoteFromProject).filter(Boolean)
  if (!projects.length) {
    throw new Error(
      'decomp.dev feed unavailable and no mirror, snapshot, or local catalogue could be loaded',
    )
  }
  console.warn(
    `decomp.dev feed unavailable; rehydrating ${projects.length} projects from decomp-dev-projects.js.`,
  )
  return { projects, source: 'catalogue', status }
}
