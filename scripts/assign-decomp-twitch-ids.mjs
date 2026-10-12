/**
 * Assigns Twitch directory box art ids to decomp.dev rows (no Twitch app).
 * Matches cleaned game titles against a public name/id list, then writes
 * src/data/decomp-dev-twitch-cache.json. Ambiguous or missing matches are logged
 * so they can be filled manually in that JSON file.
 *
 * Usage: npm run assign:decomp-twitch
 * Batch size (default 50): DECOMP_TWITCH_LIMIT=50
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  DECOMP_DEV,
  DECOMP_DEV_EXCLUDED_PLATFORMS,
  isDecompDevExcludedRepo,
} from '../src/data/decomp-dev-source.js'
import { portProjects } from '../src/data/projects.js'
import { cleanGameTitle, isDecompDevGame } from './decomp-dev-metadata.mjs'
import { loadTwitchCache, saveTwitchCache } from './decomp-dev-twitch-cache.mjs'

const TWITCH_GAMES_URL =
  'https://raw.githubusercontent.com/parmenashp/TwitchGamesIDs/main/TwitchGamesIDs.json'
const TWITCH_GAMES_CACHE = fileURLToPath(
  new URL('../.cache/TwitchGamesIDs.json', import.meta.url),
)
const GIST_URL =
  'https://gist.githubusercontent.com/basilbenny1002/7a0c2096b691048f5de8c100afcbe1a7/raw'
const GIST_CACHE = fileURLToPath(new URL('../.cache/twitch-category-ids.json', import.meta.url))
const ALIASES_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-aliases.json', import.meta.url),
)
const MANUAL_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-manual.json', import.meta.url),
)
const IGNORE_CATEGORIES_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-ignore-categories.json', import.meta.url),
)

/** @returns {Promise<Record<string, string>>} */
const loadAliases = async () => {
  try {
    const raw = await readFile(ALIASES_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** @returns {Promise<Record<string, number>>} */
const loadManualIds = async () => {
  try {
    const raw = await readFile(MANUAL_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    /** @type {Record<string, number>} */
    const out = {}
    for (const [key, value] of Object.entries(parsed)) {
      const id = Number.parseInt(String(value), 10)
      if (Number.isFinite(id)) out[key] = id
    }
    return out
  } catch {
    return {}
  }
}

const normalizeRepo = (url) =>
  url?.replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase() ?? ''

const ROMAN_TO_DIGIT = [
  [/\bxiii\b/gi, '13'],
  [/\bxii\b/gi, '12'],
  [/\bxi\b/gi, '11'],
  [/\bx\b/gi, '10'],
  [/\bix\b/gi, '9'],
  [/\bviii\b/gi, '8'],
  [/\bvii\b/gi, '7'],
  [/\bvi\b/gi, '6'],
  [/\bv\b/gi, '5'],
  [/\biv\b/gi, '4'],
  [/\biii\b/gi, '3'],
  [/\bii\b/gi, '2'],
]

const normalizeName = (name) => {
  let value = cleanGameTitle(name).toLowerCase().replace(/['’]/g, '')
  value = value.normalize('NFD').replace(/\p{M}/gu, '')
  for (const [pattern, digit] of ROMAN_TO_DIGIT) {
    value = value.replace(pattern, ` ${digit} `)
  }
  return value.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** @returns {Promise<Set<string>>} normalized Twitch category titles skipped during auto-match */
const loadIgnoredCategoryKeys = async () => {
  try {
    const raw = await readFile(IGNORE_CATEGORIES_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.map((name) => normalizeName(String(name))).filter((key) => key.length > 0),
    )
  } catch {
    return new Set()
  }
}

/** @param {{ name?: string }} row @param {Set<string>} ignoredCategoryKeys */
const isIgnoredTwitchCategory = (row, ignoredCategoryKeys) => {
  if (!row?.name) return true
  return ignoredCategoryKeys.has(normalizeName(row.name))
}

const processAll = process.env.DECOMP_TWITCH_ALL === '1'
const parsedLimit = Number.parseInt(process.env.DECOMP_TWITCH_LIMIT ?? '50', 10)
const batchLimit = parsedLimit > 0 ? parsedLimit : 50
const OFFSET_PATH = fileURLToPath(
  new URL('../.cache/decomp-twitch-assign-offset.json', import.meta.url),
)

/** @param {unknown} raw */
const normalizeTwitchGameRows = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      const id = row?.id ?? row?._id
      const name = row?.name
      if (!id || !name) return null
      return { id: String(id), name: String(name) }
    })
    .filter(Boolean)
}

/** @returns {Promise<{ index: Map<string, { id: string, name: string }>, rows: Array<{ name: string, id: string }> }>} */
const loadTwitchDirectoryIndex = async (ignoredCategoryKeys) => {
  await mkdir(fileURLToPath(new URL('../.cache', import.meta.url)), { recursive: true })

  try {
    const cached = await readFile(TWITCH_GAMES_CACHE, 'utf8')
    const rows = normalizeTwitchGameRows(JSON.parse(cached))
    if (rows.length > 1000) {
      const filtered = rows.filter((row) => !isIgnoredTwitchCategory(row, ignoredCategoryKeys))
      return { index: buildIndex(filtered), rows: filtered }
    }
  } catch {
    // fetch below
  }

  const response = await fetch(TWITCH_GAMES_URL, {
    headers: { 'User-Agent': 'native-oldies/1.0 (twitch games index)' },
  })
  if (!response.ok) throw new Error(`Twitch games index responded ${response.status}`)

  const rows = normalizeTwitchGameRows(await response.json())
  if (rows.length < 1000) throw new Error('Twitch games index was unexpectedly small')

  await writeFile(TWITCH_GAMES_CACHE, `${JSON.stringify(rows)}\n`)
  const filtered = rows.filter((row) => !isIgnoredTwitchCategory(row, ignoredCategoryKeys))
  return { index: buildIndex(filtered), rows: filtered }
}

const STOP_TOKENS = new Set([
  'the',
  'and',
  'of',
  'for',
  'a',
  'an',
  'video',
  'game',
  'usa',
  'eur',
  'ntsc',
  'pal',
  'japan',
  'fork',
])

const significantTokens = (normalized) =>
  normalized.split(' ').filter((token) => token.length > 2 && !STOP_TOKENS.has(token))

/**
 * @param {string} gameName
 * @param {Array<{ name: string, id: string }>} rows
 */
const isWeakTwitchName = (name) => {
  const trimmed = name.trim()
  if (trimmed.length < 4) return true
  if (/^[-–—\s]+$/.test(trimmed)) return true
  if (/^[-–—].*[-–—]$/.test(trimmed)) return true
  return false
}

/**
 * @param {string} gameName
 * @param {string} twitchName
 */
const isPlausibleTwitchMatch = (gameName, twitchName) => {
  if (isWeakTwitchName(twitchName)) return false
  const gameTokens = significantTokens(normalizeName(gameName))
  const twitchTokens = significantTokens(normalizeName(twitchName))
  if (!gameTokens.length || !twitchTokens.length) return false

  let overlap = 0
  for (const token of gameTokens) {
    if (twitchTokens.includes(token)) overlap += 1
  }

  const required = Math.min(2, gameTokens.length)
  if (overlap < required) return false
  return overlap / gameTokens.length >= 0.6
}

/**
 * @param {string} gameName
 * @param {Array<{ name: string, id: string }>} rows
 */
const findFuzzyTwitchCategory = (gameName, rows, ignoredCategoryKeys) => {
  const target = normalizeName(gameName)
  if (!target) return null

  const targetTokens = significantTokens(target)
  if (targetTokens.length < 2) return null

  let best = null
  let bestScore = 0
  let secondScore = 0

  for (const row of rows) {
    if (!row?.name || !row?.id || isWeakTwitchName(row.name)) continue
    if (isIgnoredTwitchCategory(row, ignoredCategoryKeys)) continue
    const candidate = normalizeName(row.name)
    if (!candidate) continue

    if (candidate === target) return row

    const candidateTokens = significantTokens(candidate)
    let overlap = 0
    for (const token of targetTokens) {
      if (candidateTokens.includes(token)) overlap += 1
    }
    if (overlap < Math.min(2, targetTokens.length)) continue

    const tokenRatio = overlap / targetTokens.length
    let score = tokenRatio * 90
    if (candidate.includes(target) || target.includes(candidate)) {
      score = Math.max(score, 94)
    }

    if (!isPlausibleTwitchMatch(gameName, row.name)) continue

    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      best = row
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  if (!best) return null
  if (bestScore >= 88 && bestScore - secondScore >= 5) return best
  return null
}

/**
 * @param {string} gameName
 * @param {Array<{ name: string, id: string }>} rows
 */
const findUniqueTokenSubsetMatch = (gameName, rows, ignoredCategoryKeys) => {
  const targetTokens = significantTokens(normalizeName(gameName))
  if (targetTokens.length < 2) return null

  const matches = []
  for (const row of rows) {
    if (!row?.name || !row?.id || isWeakTwitchName(row.name)) continue
    if (isIgnoredTwitchCategory(row, ignoredCategoryKeys)) continue
    const candidateTokens = significantTokens(normalizeName(row.name))
    if (!candidateTokens.length) continue

    const allPresent = targetTokens.every(
      (token) => candidateTokens.includes(token) || normalizeName(row.name).includes(token),
    )
    if (!allPresent) continue
    if (!isPlausibleTwitchMatch(gameName, row.name)) continue
    matches.push(row)
  }

  if (matches.length === 1) return matches[0]
  return null
}

/** @param {Array<{ name: string, id: string }>} rows */
const buildIndex = (rows) => {
  /** @type {Map<string, { id: string, name: string }>} */
  const index = new Map()
  for (const row of rows) {
    if (!row?.name || !row?.id) continue
    const key = normalizeName(row.name)
    if (!key || index.has(key)) continue
    index.set(key, { id: String(row.id), name: row.name })
  }
  return index
}

const feedResponse = await fetch(DECOMP_DEV.projectsFeedUrl, {
  headers: { 'User-Agent': 'native-oldies/1.0 (decomp.dev twitch assign)' },
})
if (!feedResponse.ok) throw new Error(`decomp.dev feed responded ${feedResponse.status}`)

const { projects: remoteProjects } = await feedResponse.json()
const existingRepos = new Set(
  portProjects.map((project) => normalizeRepo(project.repo)).filter(Boolean),
)

/** @type {Map<string, number>} */
const portByGame = new Map()
for (const project of portProjects) {
  if (!project.twitchBoxArtId) continue
  const key = normalizeName(project.game)
  if (key) portByGame.set(key, project.twitchBoxArtId)
}

const ignoredCategoryKeys = await loadIgnoredCategoryKeys()
const { index: directoryIndex, rows: directoryRows } =
  await loadTwitchDirectoryIndex(ignoredCategoryKeys)
const aliases = await loadAliases()
const manualIds = await loadManualIds()
const cache = await loadTwitchCache()

for (const [key, twitchBoxArtId] of Object.entries(manualIds)) {
  cache[key] = { twitchBoxArtId, twitchName: cache[key]?.twitchName ?? 'manual' }
}

/** @type {Array<{ key: string, gameName: string, shortName?: string | null }>} */
const catalog = []
for (const remote of remoteProjects) {
  const repoUrl = remote.repo_url?.trim()
  if (!repoUrl || existingRepos.has(normalizeRepo(repoUrl))) continue

  const gameName = remote.name ?? `${remote.owner}/${remote.repo}`
  if (!isDecompDevGame(gameName, remote.repo)) continue
  if (remote.platform && DECOMP_DEV_EXCLUDED_PLATFORMS.has(remote.platform)) continue
  if (isDecompDevExcludedRepo(remote.owner, remote.repo)) continue

  catalog.push({
    key: `${remote.owner}/${remote.repo}`,
    gameName,
    shortName: remote.short_name,
  })
}
catalog.sort((a, b) => a.key.localeCompare(b.key))

let offset = 0
try {
  const raw = await readFile(OFFSET_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (typeof parsed.offset === 'number' && parsed.offset >= 0) offset = parsed.offset
} catch {
  // start at 0
}

if (offset >= catalog.length) offset = 0

const batch = processAll ? catalog : catalog.slice(offset, offset + batchLimit)
const pendingCount = catalog.filter((row) => !cache[row.key]?.twitchBoxArtId).length

let assigned = 0
const needsReview = []

for (const row of batch) {
  const { key, gameName, shortName } = row
  if (cache[key]?.twitchBoxArtId) continue

  const normalized = normalizeName(gameName)
  const aliasTitle = aliases[key]
  const fromPort = portByGame.get(normalized)
  const fromShort = shortName ? directoryIndex.get(normalizeName(shortName)) : null
  const fromAlias = aliasTitle ? directoryIndex.get(normalizeName(aliasTitle)) : null
  const fromDirectory = directoryIndex.get(normalized) ?? fromShort ?? fromAlias

  if (fromPort) {
    cache[key] = { twitchBoxArtId: fromPort, twitchName: gameName }
    assigned += 1
    console.log(key, cache[key], '(from portProjects)')
    continue
  }

  const directoryHit =
    fromDirectory ??
    findUniqueTokenSubsetMatch(aliasTitle ?? gameName, directoryRows, ignoredCategoryKeys) ??
    findFuzzyTwitchCategory(aliasTitle ?? gameName, directoryRows, ignoredCategoryKeys)
  if (directoryHit) {
    const twitchBoxArtId = Number.parseInt(directoryHit.id, 10)
    if (!Number.isFinite(twitchBoxArtId)) {
      needsReview.push({ key, gameName, reason: 'invalid directory id' })
      continue
    }
    cache[key] = { twitchBoxArtId, twitchName: directoryHit.name }
    assigned += 1
    console.log(key, cache[key], fromDirectory ? '' : '(fuzzy)')
    continue
  }

  needsReview.push({ key, gameName, reason: 'no Twitch title match' })
}

await saveTwitchCache(cache)
await mkdir(fileURLToPath(new URL('../.cache', import.meta.url)), { recursive: true })
const nextOffset = processAll
  ? 0
  : offset + batch.length >= catalog.length
    ? 0
    : offset + batch.length
if (!processAll) {
  await writeFile(OFFSET_PATH, `${JSON.stringify({ offset: nextOffset })}\n`)
}

if (needsReview.length) {
  console.log('\nNeeds manual id in src/data/decomp-dev-twitch-cache.json:')
  for (const row of needsReview.slice(0, 30)) {
    console.log(`- ${row.key} — ${row.gameName} (${row.reason})`)
  }
  if (needsReview.length > 30) {
    console.log(`… and ${needsReview.length - 30} more in this batch window`)
  }
}

console.log(
  `\nCatalog slice ${offset + 1}-${offset + batch.length} of ${catalog.length} (${pendingCount} still without id). Assigned ${assigned} this run (${Object.keys(cache).length} cached). Next offset: ${nextOffset}. Run npm run sync:decomp-dev && npm run covers`,
)
